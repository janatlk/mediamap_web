import type { ViolationSlug } from "@/lib/i18n";

/*
  Предварительная оценка сообщения.

  Здесь будет языковая модель. Пока её нет, оценку даёт разбор по ключевым
  словам — и это сделано намеренно, а не от лени.

  Заглушка, выдающая случайные проценты, была бы вредной: человек видит
  «уверенность 87%» и принимает её всерьёз, а за числом ничего не стоит.
  Разбор по словам примитивен, зато каждое число объяснимо, и в выводе
  видно, за что оно получено.

  Когда подключим модель, меняется одна функция — assess. Всё остальное,
  включая хранение и показ, уже рассчитано на оба источника: поле aiSource
  говорит, чем именно снята оценка.
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
export function assess(input: AssessInput): Assessment {
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
