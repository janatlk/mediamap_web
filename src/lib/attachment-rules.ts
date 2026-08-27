import { ATTACHMENT_KIND, type AttachmentKind } from "./enums";

/*
  Что можно приложить к сообщению.

  Список белый: разрешено ровно то, что здесь перечислено, всё остальное не
  принимается. Чёрный список пришлось бы дописывать после каждой новой
  выдумки, а пропущенный в нём тип — это исполняемый файл, который мы сами
  раздаём проверяющему.

  Тип берём не из расширения имени: имя присылает браузер, и «фото.jpg»
  ничего не обещает. Расширение мы, наоборот, выводим из типа сами.
*/

type Rule = {
  kind: AttachmentKind;
  /** Расширение, с которым файл ляжет в хранилище. */
  ext: string;
};

const RULES: Record<string, Rule> = {
  "image/jpeg": { kind: ATTACHMENT_KIND.IMAGE, ext: "jpg" },
  "image/png": { kind: ATTACHMENT_KIND.IMAGE, ext: "png" },
  "image/webp": { kind: ATTACHMENT_KIND.IMAGE, ext: "webp" },
  "image/gif": { kind: ATTACHMENT_KIND.IMAGE, ext: "gif" },
  "video/mp4": { kind: ATTACHMENT_KIND.VIDEO, ext: "mp4" },
  "video/webm": { kind: ATTACHMENT_KIND.VIDEO, ext: "webm" },
  "video/quicktime": { kind: ATTACHMENT_KIND.VIDEO, ext: "mov" },
};

/** Что подставить в accept у поля выбора файла. */
export const ACCEPT = Object.keys(RULES).join(",");

/*
  Потолки размера.

  Числа здесь стоят маленькие не потому, что снимки столько весят, а
  потому, что стенд временно живёт на Vercel: там тело запроса ограничено
  4,5 МБ на уровне площадки, настройками это не снимается, и всё сверх
  обрывается с ошибкой 413 на полпути.

  Поэтому 4 МБ, с запасом на служебную часть запроса. Снимок экрана с
  телефона сюда укладывается почти всегда, запись экрана — почти никогда.
  Это осознанная потеря на время: на своём сервере эти числа возвращаются
  к 8 и 32 МБ, и больше ничего менять не нужно — next.config.ts берёт
  потолок тела запроса отсюда же.
*/
export const LIMITS = {
  /** Сколько файлов принимаем к одному сообщению. */
  FILES: 5,
  /** Снимок экрана с телефона обычно 1-3 МБ. */
  IMAGE_BYTES: 4 * 1024 * 1024,
  /** Видео сюда почти не влезает — на Vercel это ожидаемо. */
  VIDEO_BYTES: 4 * 1024 * 1024,
  /** Столько уходит на сервер за один раз, см. next.config.ts. */
  TOTAL_BYTES: 4 * 1024 * 1024,
};

export const ruleFor = (mime: string): Rule | null => RULES[mime] ?? null;

/** Потолок размера для этого типа файла. */
export const maxBytesFor = (kind: AttachmentKind): number =>
  kind === ATTACHMENT_KIND.VIDEO ? LIMITS.VIDEO_BYTES : LIMITS.IMAGE_BYTES;

/** Мегабайты для показа человеку: «8 МБ», а не «8388608». */
export const megabytes = (bytes: number): number =>
  Math.round(bytes / (1024 * 1024));
