import { db } from "@/lib/db";
import {
  LIMITS,
  maxBytesFor,
  ruleFor,
} from "@/lib/attachment-rules";
import { put, remove } from "./storage";

/*
  Приём приложенных файлов.

  Проверка тут вся своя и повторяет ту, что в браузере. Атрибуты accept и
  подсчёт размера на странице — подсказка человеку, не преграда: форму
  отправляют и мимо страницы.

  Что проверяем и в каком порядке: сколько файлов, известен ли тип, не
  тяжелее ли потолка, не перебрал ли весь набор вместе. Первая же неудача
  отменяет весь набор — принять три снимка из пяти и промолчать про два
  хуже, чем не принять ничего и сказать почему.
*/

export type Prepared = {
  kind: string;
  mime: string;
  size: number;
  name: string;
  key: string;
};

export type FileError =
  | "filesTooMany"
  | "fileType"
  | "fileTooBig"
  | "filesTooHeavy";

/** Имя показываем человеку, поэтому режем длину и убираем путь. */
function cleanName(raw: string): string {
  const base = raw.split(/[\/]/).pop() ?? "файл";
  return base.slice(0, 120);
}

/** Проверяет набор целиком, ничего не записывая. */
function inspect(files: File[]): FileError | null {
  if (files.length > LIMITS.FILES) return "filesTooMany";

  let total = 0;
  for (const file of files) {
    const rule = ruleFor(file.type);
    if (!rule) return "fileType";
    if (file.size > maxBytesFor(rule.kind)) return "fileTooBig";
    total += file.size;
  }

  return total > LIMITS.TOTAL_BYTES ? "filesTooHeavy" : null;
}

/**
 * Кладёт набор в хранилище.
 *
 * Если на середине что-то сорвалось, убираем уже записанное: сообщения не
 * будет, а файлы остались бы лежать навсегда — сослаться на них потом
 * нечем, и отличить их от нужных нельзя.
 */
async function store(files: File[]): Promise<Prepared[]> {
  const done: Prepared[] = [];

  try {
    for (const file of files) {
      const rule = ruleFor(file.type)!;
      const key = await put(
        Buffer.from(await file.arrayBuffer()),
        rule.ext,
      );
      done.push({
        kind: rule.kind,
        mime: file.type,
        size: file.size,
        name: cleanName(file.name),
        key,
      });
    }
  } catch (error) {
    await Promise.all(done.map((item) => remove(item.key)));
    throw error;
  }

  return done;
}

/** Файлы из формы: пустые поля браузер шлёт как файл нулевого размера. */
export const filesFrom = (form: FormData, field: string): File[] =>
  form.getAll(field).filter((item): item is File => item instanceof File && item.size > 0);

/** Проверяет и сохраняет. Ошибка — ключ для словаря, файлы не записаны. */
export async function prepare(
  files: File[],
): Promise<{ ok: true; items: Prepared[] } | { ok: false; error: FileError }> {
  if (files.length === 0) return { ok: true, items: [] };

  const problem = inspect(files);
  if (problem) return { ok: false, error: problem };

  return { ok: true, items: await store(files) };
}

/** Привязывает сохранённые файлы к сообщению. */
export async function attachTo(reportId: number, items: Prepared[]) {
  if (items.length === 0) return;
  await db.attachment.createMany({
    data: items.map((item) => ({ reportId, ...item })),
  });
}

/** Убирает файлы, которым не нашлось сообщения. */
export const discard = (items: Prepared[]) =>
  Promise.all(items.map((item) => remove(item.key)));
