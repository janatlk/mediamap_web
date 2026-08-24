import type { ViolationSlug } from "@/lib/i18n";
import { classify, mlEnabled, type MlVerdict } from "./ml-service";

/*
  Предварительная оценка сообщения.

  Здесь будет языковая модель. Пока её нет, оценку даёт разбор по ключевым
  словам — и это сделано намеренно, а не от лени.

  Заглушка, выдающая случайные проценты, была бы вредной: человек видит
  «уверенность 87%» и принимает её всерьёз, а за числом ничего не стоит.
  Разбор по словам примитивен, зато каждое число объяснимо, и в выводе
  видно, за что оно получено.

  Модель подключена: assess ходит в ML-сервис, а разбор по словам остался
  запасным путём на случай, когда сервис не поднят или не ответил. Поле
  aiSource говорит, чем именно снята оценка, — без него через полгода не
  понять, чему верить в старых записях.
*/

export type Verdict = ViolationSlug | "unclear";

export type Assessment = {
  verdict: Verdict;
  /** 0…1. Насколько разбор уверен в виде нарушения. */
  confidence: number;
  /** Из чего сложился вывод — показываем человеку целиком. */
  reasons: string[];
  /** rules — разбор по словам, model — языковая модель. */
  source: "rules" | "model";
  /** Дальше — только от модели; у разбора по словам этого нет. */
  details?: MlVerdict;
};

/** По чему судили. Заявителю это говорят прямым текстом на странице. */
export type Basis = "image" | "link" | "story";

/** Оценка вместе с тем, как она далась: для журнала и для аналитики. */
export type AssessRun = {
  assessment: Assessment;
  basis: Basis;
  latencyMs: number;
  ok: boolean;
  error: string | null;
};

/**
 * Приметы каждого вида.
 *
 * Список короткий и заведомо неполный: он и не претендует на распознавание,
 * его задача — грубо рассортировать очередь. Слова в нижнем регистре,
 * сравнение по вхождению, потому что падежи русского в список не вместить.
 */
const MARKERS: Record<ViolationSlug, string[]> = {
  "hate-speech": [
    "национальн",
    "нация",
    "этнич",
    "рели",
    "вер оскорб",
    "оскорб",
    "унижа",
    "ненавис",
    "вражд",
    "призыв",
    "не пуска",
    "выгнать",
    "убира",
    "понаех",
    "чурк",
    "мигрант",
    "приезж",
  ],
  disinformation: [
    "фейк",
    "ложн",
    "неправд",
    "враньё",
    "вранье",
    "обман",
    "поддель",
    "фальш",
    "выдум",
    "цитат",
    "указ",
    "документ",
    "статистик",
    "исследован",
    "смонтир",
    "монтаж",
    "старое фото",
    "не соответств",
  ],
  "digital-fraud": [
    "мошенн",
    "фишинг",
    "ссылк на оплат",
    "карт",
    "cvv",
    "код из смс",
    "смс",
    "перевод",
    "деньг",
    "выигр",
    "розыгрыш",
    "приз",
    "банк",
    "техподдержк",
    "взлом",
    "аккаунт",
    "пароль",
    "выплат",
    "пособи",
  ],
};

/** Сколько примет каждого вида нашлось в тексте. */
function countMarkers(text: string): Record<Verdict, number> {
  const lower = text.toLowerCase();
  const hits = { "hate-speech": 0, disinformation: 0, "digital-fraud": 0, unclear: 0 };

  for (const [slug, markers] of Object.entries(MARKERS)) {
    hits[slug as ViolationSlug] = markers.filter((marker) =>
      lower.includes(marker),
    ).length;
  }

  return hits;
}

export type AssessInput = {
  /** Что человек написал своими словами. */
  story: string;
  /** Вид, который выбрал сам человек. */
  chosenType: ViolationSlug;
  /** Есть ли ссылка на публикацию. */
  hasLink: boolean;
  /** Сама ссылка, если её оставили: модели она идёт как контекст. */
  link?: string;
  /** Приложенная картинка, если она есть и модель её осилит. */
  image?: { base64: string; mime: string };
};

const MIN_DETAILED_STORY = 200;

/**
 * Снимает предварительную оценку.
 *
 * Уверенность складывается из трёх вещей: насколько уверенно приметы
 * указывают на один вид, совпал ли он с выбором человека и насколько
 * подробно описан случай. Ни одна из них сама по себе ничего не доказывает,
 * поэтому потолок здесь — 0.8, а не единица.
 */
/**
 * Снимает оценку моделью, а если та недоступна — словарём.
 *
 * Не бросает никогда: подача сообщения не должна срываться из-за того, что
 * у постороннего сервиса выходной. Но и молчать о сбое нельзя — он ложится
 * в журнал, и в аналитике видно, как часто это происходит.
 */
export async function assess(input: AssessInput): Promise<AssessRun> {
  if (!mlEnabled()) {
    return {
      assessment: assessByRules(input),
      basis: "story",
      latencyMs: 0,
      ok: true,
      error: null,
    };
  }

  const started = Date.now();
  const first = basisFor(input);

  try {
    const verdict = await classify(payloadFor(input, first));
    return {
      assessment: fromModel(verdict, input),
      basis: first,
      latencyMs: Date.now() - started,
      ok: true,
      error: null,
    };
  } catch (error) {
    /*
      Ссылка не открылась — разбираем рассказ заявителя.

      Закрытая площадка, удалённый пост, чужой антибот: причин много, и все
      они про ссылку, а не про поломку сервиса. Ронять оценку до разбора по
      словам из-за этого нельзя — модель работает, ей просто нечего было
      открыть. Пробуем ещё раз тем, что есть.
    */
    if (first === "link") {
      try {
        const verdict = await classify(payloadFor(input, "story"));
        return {
          assessment: fromModel(verdict, input),
          basis: "story",
          latencyMs: Date.now() - started,
          ok: true,
          error: shortError(error),
        };
      } catch {
        // Второй отказ — уже про сервис, а не про ссылку. Идём вниз.
      }
    }

    return {
      assessment: assessByRules(input),
      basis: "story",
      latencyMs: Date.now() - started,
      ok: false,
      error: shortError(error),
    };
  }
}

/**
 * Что именно отправляем на разбор.
 *
 * Порядок один: снимок, потом ссылка, потом рассказ. Это не про удобство, а
 * про исправление главной ошибки: человек описывает чужую
 * публикацию своими словами, и его пересказ — не то, что нарушает. Заявитель
 * пишет «говорят, что…» или «я не верю», и модель принималась судить его
 * осторожность вместо чужого поста.
 *
 * Поэтому рассказ заявителя вместе с картинкой НЕ отправляем. Поле context у
 * сервиса означает «пост, под которым оставлен комментарий», и подсунуть туда
 * слова заявителя значило бы вернуть ту же ошибку с другой стороны: модель
 * снова читала бы его мнение как часть материала.
 *
 * Картинок может быть несколько, а сервис берёт одну. Берём первую: снимок
 * обычно один, а остальные — то же самое с другого угла.
 */
function basisFor(input: AssessInput): Basis {
  if (input.image) return "image";
  if (input.link) return "link";
  return "story";
}

function payloadFor(
  input: AssessInput,
  basis: Basis,
): Parameters<typeof classify>[0] {
  if (basis === "image" && input.image) {
    return {
      content_type: "image",
      image_base64: input.image.base64,
      image_mime: input.image.mime,
    };
  }

  if (basis === "link" && input.link) {
    return { content_type: "url", url: input.link };
  }

  // Ссылку в контекст не кладём: там ждут текст поста, а голый адрес модель
  // читает как содержимое — и рассуждает о наборе символов в нём.
  return { content_type: "text", text: input.story };
}

/**
 * Ответ модели в вид, который понимает остальной сайт.
 *
 * Расхождение с выбором заявителя не понижает уверенность: модель видела
 * текст, а человек выбирал вид из трёх пунктов, случайно не разобравшись.
 * Мы просто отмечаем расхождение — решать всё равно проверяющему.
 */
function fromModel(verdict: MlVerdict, input: AssessInput): Assessment {
  const reasons: string[] = [];
  if (verdict.slug === "unclear") reasons.push("modelFoundNothing");
  else if (verdict.slug === input.chosenType) reasons.push("matchesChoice");
  else reasons.push("differsFromChoice");
  if (verdict.requiresFactCheck) reasons.push("needsFactCheck");
  if (verdict.sources.length) reasons.push("hasSources");

  return {
    verdict: verdict.slug,
    confidence: Math.round(verdict.confidence * 100) / 100,
    reasons,
    source: "model",
    details: verdict,
  };
}

function shortError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.slice(0, 200);
}

export function assessByRules(input: AssessInput): Assessment {
  const hits = countMarkers(input.story);
  const reasons: string[] = [];

  const ranked = (Object.keys(MARKERS) as ViolationSlug[])
    .map((slug) => ({ slug, count: hits[slug] }))
    .sort((a, b) => b.count - a.count);

  const [best, second] = ranked;

  // Примет нет вовсе — честнее сказать «непонятно», чем гадать.
  if (best.count === 0) {
    return {
      verdict: "unclear",
      confidence: 0.1,
      reasons: ["noMarkers"],
      source: "rules",
    };
  }

  // База: доля примет победителя среди всех найденных.
  const total = ranked.reduce((sum, item) => sum + item.count, 0);
  let confidence = best.count / total;
  reasons.push("markersFound");

  // Отрыв от второго вида важнее самого числа совпадений.
  if (second && best.count === second.count) {
    confidence *= 0.6;
    reasons.push("ambiguous");
  }

  if (best.slug === input.chosenType) {
    confidence = Math.min(1, confidence + 0.15);
    reasons.push("matchesChoice");
  } else {
    confidence *= 0.75;
    reasons.push("differsFromChoice");
  }

  if (input.hasLink) {
    confidence = Math.min(1, confidence + 0.1);
    reasons.push("hasLink");
  } else {
    reasons.push("noLink");
  }

  if (input.story.length >= MIN_DETAILED_STORY) {
    confidence = Math.min(1, confidence + 0.05);
    reasons.push("detailed");
  } else {
    confidence *= 0.85;
    reasons.push("brief");
  }

  return {
    verdict: best.slug,
    // Потолок 0.8: разбор по словам не может быть уверен сильнее.
    confidence: Math.round(Math.min(0.8, confidence) * 100) / 100,
    reasons,
    source: "rules",
  };
}
