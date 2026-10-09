/*
  Картинка к заметке дайджеста.

  Задача со стороны проекта звучала так: рядом с каждой новостью нужна
  именно фотография публикации, а не то, что висит вокруг неё на сайте
  издания. Поэтому гадать по вёрстке страницы мы не пытаемся — берём то,
  что издание само назначило картинкой материала:

    1. Поля ленты. У большинства RSS есть media:content, media:thumbnail
       или enclosure — это и есть фотография поста, выбранная редакцией.
    2. Картинка внутри описания. Часть лент кладёт <img> первым тегом.
    3. og:image со страницы материала. Эту разметку издания делают для
       соцсетей, и в ней стоит обложка поста, а не баннер.

  Первый подошедший вариант и берём. До страницы доходим редко — только
  когда лента не отдала ничего, — и запрос к ней идёт один на заметку, один
  раз за всё время: результат остаётся в базе.
*/

/** Сколько ждать страницу материала. Дольше — остаёмся без картинки. */
const PAGE_TIMEOUT_MS = 10_000;

/** Сколько головы страницы читать. og:image стоит в <head>, дальше не нужно. */
const MAX_PAGE_BYTES = 256 * 1024;

/** Пиксельные счётчики и прозрачные заглушки картинкой не считаем. */
const JUNK =
  /(1x1|pixel|spacer|blank|transparent|doubleclick|adserver|\/ads?\/)/i;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

/** Адрес, годный к показу: абсолютный http(s) и не похож на счётчик. */
export function usableImage(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  if (value.length > 2048) return null;
  if (JUNK.test(value)) return null;
  return value;
}

/** Значение атрибута у узла или у первого элемента списка узлов. */
function attr(node: unknown, name: string): string | null {
  const list = Array.isArray(node) ? node : [node];
  for (const item of list) {
    if (item && typeof item === "object") {
      const value = (item as Record<string, unknown>)[name];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

/** Картинка из полей самой ленты. */
export function imageFromFeed(node: Record<string, unknown>): string | null {
  const media = node["media:content"] ?? node["media:thumbnail"];
  const fromMedia = usableImage(attr(media, "@url"));
  if (fromMedia) return fromMedia;

  /*
    enclosure — это «вложение» вообще: там же лежат подкасты и видео.
    Берём только то, что заявлено картинкой или выглядит ею по расширению:
    иначе в полке с фотографиями оказывался mp3.
  */
  const enclosure = node.enclosure;
  const url = attr(enclosure, "@url");
  const type = attr(enclosure, "@type") ?? "";
  if (url && (type.startsWith("image/") || IMAGE_EXT.test(url))) {
    const fromEnclosure = usableImage(url);
    if (fromEnclosure) return fromEnclosure;
  }

  return null;
}

/** Первая картинка внутри куска HTML — описания или полного текста. */
export function imageFromHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  for (const match of html.matchAll(/<img\b[^>]*?\ssrc=["']([^"']+)["']/gi)) {
    const found = usableImage(match[1]);
    if (found) return found;
  }
  return null;
}

/** Содержимое meta по property или name. */
function meta(head: string, key: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`,
    "i",
  );
  const tag = pattern.exec(head)?.[0];
  if (!tag) return null;
  return /content=["']([^"']+)["']/i.exec(tag)?.[1] ?? null;
}

/**
 * og:image со страницы материала.
 *
 * Ошибку не пробрасываем: картинка — украшение, и из-за недоступной
 * страницы заметка не должна пропасть из дайджеста.
 */
export async function imageFromPage(pageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pageUrl, {
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      headers: {
        "User-Agent": "MediaMapBot/1.0 (+https://mediamap.kg)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!response.ok || !response.body) return null;

    // Читаем голову, а не страницу целиком: статья с комментариями бывает
    // в мегабайт, а нужные теги стоят в первых килобайтах.
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let head = "";
    try {
      while (head.length < MAX_PAGE_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        head += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(head)) break;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }

    const found =
      meta(head, "og:image") ??
      meta(head, "og:image:url") ??
      meta(head, "twitter:image") ??
      meta(head, "twitter:image:src");

    // Относительный адрес дорешиваем по адресу страницы: часть изданий
    // пишет в og:image путь без домена.
    if (!found) return null;
    try {
      return usableImage(new URL(found, pageUrl).toString());
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
