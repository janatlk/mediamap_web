import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/*
  Хранилище приложенных файлов.

  Сейчас это папка на диске, потом станет ведро в R2. Наружу торчат три
  функции, и ни одна не обещает, что ключ — это путь: снаружи он просто
  строка. Так переезд будет переписыванием одного файла, а не поиском по
  всему проекту, где мы склеили путь руками.

  Папка лежит вне public намеренно. В public раздаёт сам Next, без единой
  проверки, — и снимки из ещё не рассмотренных сообщений оказались бы
  открыты всем, у кого есть ссылка. Раздаёт их наш обработчик, он же
  решает, кому можно.
*/

const ROOT = path.join(process.cwd(), "uploads");

/** Ключ вида 2026-08/9f8e…c1.jpg. Имя случайное: присланному верить нельзя. */
function makeKey(ext: string): string {
  const now = new Date();
  const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${folder}/${randomUUID()}.${ext}`;
}

/** Кладёт файл в хранилище и возвращает ключ, по которому его потом найти. */
export async function put(data: Buffer, ext: string): Promise<string> {
  const key = makeKey(ext);
  const target = path.join(ROOT, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return key;
}

/**
 * Поток на чтение по ключу.
 *
 * Именно поток, а не Buffer: видео на тридцать мегабайт незачем целиком
 * поднимать в память ради того, чтобы тут же отдать его в сеть.
 */
export function read(key: string): ReturnType<typeof createReadStream> {
  return createReadStream(resolve(key));
}

/** Убирает файл. Молчит, если его уже нет: результат всё равно нужный. */
export async function remove(key: string): Promise<void> {
  try {
    await unlink(resolve(key));
  } catch {
    // Файла нет — значит удалять нечего.
  }
}

/*
  Ключ приходит из базы, но пусть он хоть трижды свой: собранный путь
  обязан остаться внутри ROOT. Одного "../../.env" в ключе достаточно,
  чтобы обработчик начал раздавать что попало с диска.
*/
function resolve(key: string): string {
  const target = path.resolve(ROOT, key);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    throw new Error(`Ключ ведёт наружу хранилища: ${key}`);
  }
  return target;
}
