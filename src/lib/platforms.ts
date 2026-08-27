/*
  Кто автор публикации — по её ссылке.

  Реестр источников не может опираться на домен: facebook.com — это не
  источник, это площадка, и записать в чёрный список её целиком нельзя.
  Источник — конкретный аккаунт или канал на площадке, и вытащить его надо
  из ссылки, которую прислал заявитель.

  Здесь только разбор строки, без единого запроса в сеть. Так сделано
  намеренно: ходить за страницей ради имени автора значит либо нарушать
  правила площадки, либо зависеть от того, что она сегодня отдаёт.

  ── Чего этот разбор не умеет, и это важно ──────────────────────────────

  У части ссылок автора в адресе нет вовсе. Пост в Instagram выглядит как
  instagram.com/p/CODE/ — ни имени, ни номера. То же у отдельных ссылок
  Facebook и у youtube.com/watch?v=… Для таких источник заводится по
  доменной части, а привязать его к аккаунту может только человек, открыв
  ссылку глазами.

  Ещё важнее: устойчивый номер аккаунта в адресе встречается редко
  (facebook.com/profile.php?id=…, youtube.com/channel/UC…, vk.com/wall-…).
  Обычно есть только имя, а оно меняется — ради чего реестр и затевался.
  Значит «этот аккаунт переименовался» машина сама не поймёт: она увидит
  два разных имени. Связать их в один источник должен проверяющий, и
  панель для этого даёт отдельное действие.
*/

export const PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "telegram",
  "twitter",
  "vk",
  "odnoklassniki",
  "web",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_NAME: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  telegram: "Telegram",
  twitter: "X (Twitter)",
  vk: "ВКонтакте",
  odnoklassniki: "Одноклассники",
  web: "Сайт",
};

export type SourceRef = {
  platform: Platform;
  /** Имя аккаунта из ссылки. Меняется — за ним и следим. */
  handle: string | null;
  /**
   * Устойчивый номер аккаунта, если площадка положила его в адрес.
   * Он не меняется при переименовании — только по нему машина и может
   * узнать переименовавшийся аккаунт.
   */
  externalId: string | null;
  /** Домен. Для источников без имени он единственное, что у нас есть. */
  host: string;
};

const HOSTS: Record<string, Platform> = {
  "instagram.com": "instagram",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "fb.watch": "facebook",
  "tiktok.com": "tiktok",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "t.me": "telegram",
  "telegram.me": "telegram",
  "twitter.com": "twitter",
  "x.com": "twitter",
  "vk.com": "vk",
  "vk.ru": "vk",
  "ok.ru": "odnoklassniki",
};

/** Куски пути, которые именем аккаунта не являются. */
const NOT_A_HANDLE = new Set([
  "p", "reel", "reels", "tv", "stories", "explore", "s", "share",
  "watch", "shorts", "video", "posts", "photo", "groups", "permalink",
  "c", "channel", "user", "embed", "playlist", "status", "i", "wall",
  "profile.php", "story.php", "login", "search", "hashtag",
]);

const cleanHandle = (raw: string): string | null => {
  const value = decodeURIComponent(raw).replace(/^@/, "").trim();
  if (!value || NOT_A_HANDLE.has(value.toLowerCase())) return null;
  // Имена площадок — латиница, цифры, точка, подчёркивание, дефис.
  return /^[A-Za-z0-9._-]{2,64}$/.test(value) ? value : null;
};

/**
 * Кто это опубликовал — насколько видно из адреса.
 *
 * Возвращает null, если строка вообще не ссылка: сообщения приходят от
 * людей, и в поле ссылки попадает что угодно.
 */
export function readSource(link: string | null): SourceRef | null {
  if (!link) return null;

  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const platform = HOSTS[host] ?? "web";
  const parts = url.pathname.split("/").filter(Boolean);

  const base: SourceRef = { platform, handle: null, externalId: null, host };

  switch (platform) {
    case "telegram":
      // t.me/name/123 и t.me/s/name — во втором «s» это не имя.
      return { ...base, handle: cleanHandle(parts[0] === "s" ? parts[1] ?? "" : parts[0] ?? "") };

    case "tiktok":
    case "twitter":
    case "instagram":
      // Первый кусок пути — имя, если это не «p», «reel», «status».
      return { ...base, handle: cleanHandle(parts[0] ?? "") };

    case "youtube": {
      // Номер канала UC… не меняется никогда — это лучшее, что бывает.
      if (parts[0] === "channel" && parts[1]) {
        return { ...base, externalId: parts[1] };
      }
      return { ...base, handle: cleanHandle(parts[0] ?? "") };
    }

    case "facebook": {
      const numeric = url.searchParams.get("id");
      if (numeric && /^\d+$/.test(numeric)) return { ...base, externalId: numeric };
      return { ...base, handle: cleanHandle(parts[0] ?? "") };
    }

    case "vk": {
      // vk.com/wall-12345_678 — «12345» это номер сообщества.
      const wall = /^wall-?(\d+)_/.exec(parts[0] ?? "");
      if (wall) return { ...base, externalId: wall[1] };
      return { ...base, handle: cleanHandle(parts[0] ?? "") };
    }

    default:
      /*
        Обычный сайт: источник — это издание целиком, то есть домен.

        Первый кусок пути тут именем аккаунта не бывает. Сначала он всё же
        разбирался как имя, и 24.kg/vlast/123_text/ давал «аккаунт vlast» —
        хотя vlast там раздел, а не автор. Хуже того, ключ выходил
        web:@vlast, и одноимённый раздел на другом сайте слился бы с ним
        в один источник.
      */
      return base;
  }
}

/**
 * Ключ, по которому источник узнаётся в базе.
 *
 * Номер устойчивее имени, поэтому он первым: аккаунт переименуется, а ключ
 * останется тем же, и история имён соберётся сама. Где номера нет, ключ
 * собирается из имени — и после переименования появится второй источник,
 * который проверяющий сольёт с первым руками.
 */
export function sourceKey(ref: SourceRef): string {
  if (ref.externalId) return `${ref.platform}:id:${ref.externalId}`;
  if (ref.handle) return `${ref.platform}:@${ref.handle.toLowerCase()}`;
  /*
    Автора из адреса не видно. Ключ собирается из площадки и домена — все
    такие ссылки складываются в одну кучу «автор не определён» по каждой
    площадке. Куча эта рабочая, а не свалка: проверяющий открывает ссылку,
    видит автора глазами и переносит случай к нужному источнику.
  */
  return `${ref.platform}:host:${ref.host}`;
}

/** Как показать источник человеку. */
export function sourceLabel(ref: {
  platform: string;
  handle: string | null;
  host: string;
}): string {
  if (ref.handle) return `@${ref.handle}`;
  return ref.host;
}
