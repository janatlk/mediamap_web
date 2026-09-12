import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import { READY_LANGUAGES, type Lang } from "@/lib/i18n/languages";
import { mlServiceUrl } from "./ml-service";
import { guessLanguage } from "./translate";

/*
  Перевод наших текстов о случае на язык читателя.

  Разбор ИИ пишется по-английски, заметку проверяющий пишет по-русски, а
  читают случай на трёх языках. Раньше разбор шёл на языке поста, и
  прочесть его мог только тот, кто этот язык знает. Теперь каждый текст
  переводится моделью NLLB на язык страницы.

  Перевод — секунды процессорного времени, поэтому переведённое хранится.
  Ключ — отпечаток текста: поправили текст — появится новый перевод.

  Не вышел перевод — показываем оригинал. Для этих текстов это честнее
  пустого места: английский разбор понятнее, чем никакого.
*/

type Source = "en" | "ru" | "ky" | "auto";

/*
  Сколько ждать модель. Страница ждёт недолго: не успели — покажем
  оригинал, а перевод догонит фоновый прогрев. Фоновому прогреву спешить
  некуда, и обрывать его нельзя: модель доделает брошенную работу всё
  равно, а перевод пропадёт.
*/
const PAGE_WAIT_MS = 25_000;
const WARM_WAIT_MS = 5 * 60_000;
const PER_REQUEST = 8;

const hashOf = (text: string) => createHash("sha256").update(text).digest("hex");

/**
 * Язык исходника. Разбор ИИ — английский, но с цитатами из поста по-русски
 * или по-кыргызски, поэтому сравниваем, каких букв больше, а не есть ли
 * кириллица вообще.
 */
function sourceOf(text: string, source: Source): string {
  if (source !== "auto") return source;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  const cyrillic = (text.match(/[Ѐ-ӿ]/g) ?? []).length;
  if (latin > cyrillic) return "en";
  return guessLanguage(text) === "ky" ? "ky" : "ru";
}

/**
 * Переводит тексты на язык страницы. Порядок и пустые места сохраняются.
 *
 * live — можно ли спрашивать модель, если в памяти перевода нет. На
 * странице одного случая — да, там ждут. В списках — нет: двадцать
 * переводов подряд страница не дождётся, там берём только готовое.
 */
export async function translateTexts(
  texts: (string | null | undefined)[],
  lang: Lang,
  {
    source = "auto",
    live = true,
    waitMs = PAGE_WAIT_MS,
  }: { source?: Source; live?: boolean; waitMs?: number } = {},
): Promise<(string | null)[]> {
  const jobs = new Map<string, { text: string; from: string }>();
  for (const text of texts) {
    const clean = text?.trim();
    if (!clean) continue;
    const from = sourceOf(clean, source);
    if (from !== lang) jobs.set(hashOf(clean), { text: clean, from });
  }

  const done = new Map<string, string>();
  if (jobs.size > 0) {
    try {
      const saved = await db.textTranslation.findMany({
        where: { lang, hash: { in: [...jobs.keys()] } },
        select: { hash: true, text: true },
      });
      for (const row of saved) done.set(row.hash, row.text);

      if (live) {
        const missing = [...jobs].filter(([hash]) => !done.has(hash));
        for (const [hash, text] of await askModel(missing, lang, waitMs)) {
          done.set(hash, text);
        }
      }
    } catch (error) {
      console.error("перевод текстов не вышел:", error);
    }
  }

  return texts.map((text) => {
    const clean = text?.trim();
    if (!clean) return text ?? null;
    const translated = done.get(hashOf(clean));
    return translated ? likeOriginal(clean, translated) : clean;
  });
}

/*
  Модель ставит точку в конце всегда, даже заголовку, у которого её не
  было: выходило «…деп аташат .». Нет знака в оригинале — нет и в переводе.
*/
function likeOriginal(original: string, translated: string): string {
  if (/[.!?…]$/.test(original)) return translated;
  return translated.replace(/\s*[.。]+$/, "");
}

/** Спрашивает модель пачками по языку оригинала и сохраняет ответы. */
async function askModel(
  missing: [string, { text: string; from: string }][],
  lang: Lang,
  waitMs: number,
): Promise<[string, string][]> {
  const base = mlServiceUrl();
  if (!base || missing.length === 0) return [];

  const bySource = new Map<string, [string, string][]>();
  for (const [hash, { text, from }] of missing) {
    bySource.set(from, [...(bySource.get(from) ?? []), [hash, text]]);
  }

  const result: [string, string][] = [];
  for (const [from, items] of bySource) {
    // Понемногу: модель одна и работает под замком, и большая пачка
    // заставила бы ждать всех остальных, включая открытую страницу.
    for (let start = 0; start < items.length; start += PER_REQUEST) {
      const part = items.slice(start, start + PER_REQUEST);
      const response = await fetch(`${base}/translate/many`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: part.map(([, text]) => text), target: lang, source: from }),
        signal: AbortSignal.timeout(waitMs),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`перевод: сервис ответил ${response.status}`);

      const reply = (await response.json()) as { texts: string[]; model: string };
      for (const [index, [hash]] of part.entries()) {
        const text = reply.texts[index]?.trim();
        if (!text) continue;
        result.push([hash, text]);
        // upsert: ту же заметку могут переводить одновременно страница и
        // фоновый прогрев после сохранения.
        await db.textTranslation.upsert({
          where: { hash_lang: { hash, lang } },
          update: {},
          create: { hash, lang, text, model: reply.model },
        });
      }
    }
  }
  return result;
}

/**
 * Готовит переводы на все языки сайта заранее — после разбора и после
 * решения проверяющего. Тогда и списки случаев, где модель не спрашивают,
 * показывают перевод, и страница случая открывается без ожидания.
 */
export async function warmTranslations(
  texts: (string | null | undefined)[],
  source: Source = "auto",
): Promise<void> {
  for (const lang of READY_LANGUAGES) {
    await translateTexts(texts, lang, { source, live: true, waitMs: WARM_WAIT_MS });
  }
}

/** Все тексты сообщения, которые читатель видит, — для прогрева. */
export async function warmReport(id: number): Promise<void> {
  const row = await db.report.findUnique({
    where: { id },
    select: {
      headline: true,
      aiSummary: true,
      aiSource: true,
      aiTypeChecks: true,
      reviewSummary: true,
      moderatorComment: true,
    },
  });
  if (!row) return;

  const checks = checkTexts(row.aiTypeChecks);
  await warmTranslations([
    row.headline,
    row.aiSource === "model" ? row.aiSummary : null,
    ...checks,
    row.reviewSummary,
    row.moderatorComment,
  ]);
}

function checkTexts(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, { explanation?: string }>;
    return Object.values(parsed ?? {})
      .map((check) => check?.explanation ?? "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

