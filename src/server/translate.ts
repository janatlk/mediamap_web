import { db } from "@/lib/db";
import { isTranslationLang, type TranslationLang } from "@/lib/translation-languages";
import { mlServiceUrl } from "./ml-service";

/*
  Перевод новостей.

  Переводит не языковая модель по сети, а NLLB на нашем же сервере — она для
  этого и сделана, кыргызский знает, и платить за каждую заметку не нужно.
  Здесь только HTTP до ML-сервиса и память о том, что уже переведено.

  Кэш обязателен, а не «на будущее»: перевод занимает секунды процессорного
  времени, а одну и ту же заметку откроют десятки раз. Текст новости не
  меняется, поэтому переведённое однажды годится навсегда.
*/

export { isTranslationLang };
export type { TranslationLang };

export type Translated = { title: string; snippet: string | null };

/**
 * Язык оригинала.
 *
 * Модели надо сказать, с чего переводить, а в ленте языка нет: заметки
 * приходят из чужих RSS без разметки. Определяем по буквам — грубо, но
 * достаточно: ошибка в источнике портит перевод, а не ломает его.
 *
 * Кыргызский от русского отличаем по ө, ү, ң — букв мало, но в кыргызском
 * тексте хоть одна попадается почти всегда.
 */
export function guessLanguage(text: string): string {
  if (/[өүң]/i.test(text)) return "ky";
  if (/[Ѐ-ӿ]/.test(text)) return "ru";
  return "en";
}

type TranslateReply = { text: string; model: string };

async function askService(
  text: string,
  target: string,
  source: string,
): Promise<TranslateReply> {
  const base = mlServiceUrl();
  if (!base) throw new Error("ML_SERVICE_URL не задан");

  const response = await fetch(`${base}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target, source }),
    signal: AbortSignal.timeout(timeoutMs()),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`перевод: сервис ответил ${response.status}`);
  }

  return (await response.json()) as TranslateReply;
}

/**
 * Перевод одной новости — из памяти или свежий.
 *
 * Бросает, если сервис не ответил: вызывающий покажет оригинал и скажет, что
 * перевод не вышел. Молча вернуть исходный текст нельзя — человек решит, что
 * так и переведено.
 */
export async function translateNewsItem(
  newsId: number,
  target: TranslationLang,
): Promise<Translated> {
  const saved = await db.newsTranslation.findUnique({
    where: { newsId_lang: { newsId, lang: target } },
  });
  if (saved) return { title: saved.title, snippet: saved.snippet };

  const item = await db.newsItem.findUnique({ where: { id: newsId } });
  if (!item) throw new Error("новости нет");

  const source = guessLanguage(`${item.title} ${item.snippet ?? ""}`);

  const title = await askService(item.title, target, source);
  // Подзаголовок переводим вторым запросом, а не склейкой: склеенные через
  // перенос строки заголовок и текст модель иногда сшивает в одну фразу.
  const snippet = item.snippet
    ? await askService(item.snippet, target, source)
    : null;

  const translated: Translated = {
    title: title.text,
    snippet: snippet?.text ?? null,
  };

  /*
    upsert, а не create: два человека могут открыть одну заметку
    одновременно, и второй наткнулся бы на нарушение уникальности.
  */
  await db.newsTranslation.upsert({
    where: { newsId_lang: { newsId, lang: target } },
    update: {},
    create: {
      newsId,
      lang: target,
      title: translated.title,
      snippet: translated.snippet,
      model: title.model,
    },
  });

  return translated;
}

/**
 * Перевод занимает секунды: модель считает на процессоре, без видеокарты.
 * Ждём заметно дольше обычного запроса, но не бесконечно.
 */
function timeoutMs(): number {
  const raw = Number(process.env.TRANSLATE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}
