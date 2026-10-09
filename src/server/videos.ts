import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { db } from "@/lib/db";
import { isReadyLanguage, type Lang } from "@/lib/i18n/languages";
import { VIDEO_MAX_BYTES, VIDEO_TYPES } from "@/lib/video-rules";
import { put, remove } from "./storage";

/*
  Ролики для главной.

  Файлы лежат у нас, а не ссылками на соцсети: ролик в чужой ленте живёт до
  первого удаления, а встроенный плеер заодно показывает соцсети наших
  читателей.

  Обложку снимаем сами с первой секунды. Без неё браузер до нажатия рисует
  чёрный прямоугольник — на главной это выглядит как не загрузившийся блок.
  Нет ffmpeg или не справился — обходимся без обложки, ролик от этого не
  ломается.
*/


export type VideoRow = {
  id: number;
  title: string;
  seconds: number | null;
  hasPoster: boolean;
  /** Широкий ролик (YouTube) показываем не так, как вертикальный. */
  wide: boolean;
};

/*
  Ролики для главной того языка, на котором её читают.

  Переводить ролик нельзя — он озвучен, — поэтому у каждого языка свои
  файлы. Нет кыргызских роликов, значит на кыргызской главной блока просто
  не будет: показывать русский ролик вместо кыргызского хуже, чем не
  показывать ничего.
*/
export async function loadVideos(lang: Lang, limit = 12): Promise<VideoRow[]> {
  const rows = await db.video.findMany({
    where: { published: true, draft: false, lang },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      seconds: true,
      posterKey: true,
      width: true,
      height: true,
    },
  });

  return rows.map(({ posterKey, width, height, ...rest }) => ({
    ...rest,
    hasPoster: posterKey !== null,
    // Размеров нет у роликов, снятых без ffprobe: считаем их вертикальными,
    // такими их и загружали.
    wide: width !== null && height !== null && width > height,
  }));
}

/** Всё подряд — для панели. */
export const loadAllVideos = () =>
  db.video.findMany({
    // Сначала по языку: так группы не перемешаны, и стрелки двигают ролик
    // внутри своей группы, а не через всю таблицу.
    orderBy: [{ lang: "asc" }, { position: "asc" }, { createdAt: "desc" }],
  });

export type SavedVideo = { id: number } | { error: string };

/** Принимает файл, снимает обложку, заводит запись. */
export async function saveVideo(
  title: string,
  lang: string,
  file: File,
): Promise<SavedVideo> {
  const ext = VIDEO_TYPES[file.type];
  if (!ext) return { error: `Такой тип файла не принимаем: ${file.type || "неизвестно"}` };
  if (file.size > VIDEO_MAX_BYTES) {
    return { error: `Файл больше ${Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} МБ` };
  }

  return storeVideo({
    title,
    lang,
    data: Buffer.from(await file.arrayBuffer()),
    mime: file.type,
  });
}

/**
 * Кладёт ролик в хранилище и заводит запись.
 *
 * Общее для двух путей: файл с компьютера и файл, скачанный по ссылке.
 * Черновик (draft) показывается только в панели — редактор сначала смотрит,
 * что скачалось, и только потом подтверждает.
 */
export async function storeVideo({
  title,
  lang,
  data,
  mime,
  sourceUrl,
  draft = false,
}: {
  title: string;
  lang: string;
  data: Buffer;
  mime: string;
  sourceUrl?: string;
  draft?: boolean;
}): Promise<SavedVideo> {
  const clean = title.trim();
  if (!clean) return { error: "Нужно название ролика" };
  if (!isReadyLanguage(lang)) return { error: "Неизвестный язык ролика" };

  const ext = VIDEO_TYPES[mime] ?? "mp4";
  const key = await put(data, ext);

  const probed = await describe(data, ext);
  const posterKey = probed.poster ? await put(probed.poster, "jpg") : null;

  // Новый ролик встаёт первым среди роликов своего языка.
  const first = await db.video.findFirst({
    where: { lang },
    orderBy: { position: "asc" },
  });

  const row = await db.video.create({
    data: {
      title: clean,
      lang,
      key,
      mime,
      size: data.length,
      posterKey,
      seconds: probed.seconds,
      width: probed.width,
      height: probed.height,
      sourceUrl: sourceUrl ?? null,
      draft,
      position: (first?.position ?? 0) - 1,
    },
  });

  return { id: row.id };
}

/** Убирает запись вместе с файлами: осиротевшее видео на диске не нужно. */
export async function dropVideo(id: number): Promise<void> {
  const row = await db.video.findUnique({ where: { id } });
  if (!row) return;

  await db.video.delete({ where: { id } });
  await remove(row.key);
  if (row.posterKey) await remove(row.posterKey);
}

/** Меняет ролик местами с соседним своего языка. */
export async function moveVideo(id: number, up: boolean): Promise<void> {
  const moved = await db.video.findUnique({ where: { id }, select: { lang: true } });
  if (!moved) return;

  const rows = await db.video.findMany({
    where: { lang: moved.lang },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  const at = rows.findIndex((row) => row.id === id);
  const to = up ? at - 1 : at + 1;
  if (at === -1 || to < 0 || to >= rows.length) return;

  [rows[at], rows[to]] = [rows[to], rows[at]];

  // Переписываем весь порядок: роликов десятки, а не тысячи, зато после
  // этого позиции всегда 0,1,2… без дыр и повторов.
  await db.$transaction(
    rows.map((row, index) =>
      db.video.update({ where: { id: row.id }, data: { position: index } }),
    ),
  );
}

/** Длительность, размер кадра и обложка. Любое может не получиться. */
async function describe(
  data: Buffer,
  ext: string,
): Promise<{
  seconds: number | null;
  width: number | null;
  height: number | null;
  poster: Buffer | null;
}> {
  const dir = await mkdtemp(path.join(tmpdir(), "mm-video-"));
  const source = path.join(dir, `in.${ext}`);
  const shot = path.join(dir, "poster.jpg");

  try {
    await writeFile(source, data);

    const length = await run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      source,
    ]);
    const seconds = length ? Math.round(Number.parseFloat(length)) || null : null;

    // Размер кадра решает, какой карточкой показывать ролик: вертикальной,
    // как рилс, или широкой, как с YouTube.
    const frame = await run("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      source,
    ]);
    const [width, height] = (frame ?? "")
      .split(",")
      .map((value) => Number.parseInt(value, 10) || null);

    // Кадр берём с первой секунды, а не с нулевой: в самом начале у роликов
    // часто чёрный кадр перехода.
    const made = await run("ffmpeg", [
      "-v", "error",
      "-ss", "1",
      "-i", source,
      "-frames:v", "1",
      "-vf", "scale=-2:720",
      "-q:v", "4",
      "-y", shot,
    ]);

    const poster = made === null ? null : await readFile(shot).catch(() => null);
    return { seconds, width: width ?? null, height: height ?? null, poster };
  } catch {
    return { seconds: null, width: null, height: null, poster: null };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Запускает утилиту и отдаёт её вывод. null — утилиты нет или она упала. */
function run(command: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code === 0 ? out.trim() : null));
  });
}
