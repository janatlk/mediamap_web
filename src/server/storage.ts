import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/*
  Хранилище приложенных файлов.

  Два драйвера за одними и теми же тремя функциями: папка на диске и ведро
  в R2. Выбор по переменным окружения — есть ключи R2, работаем с ведром,
  нет ключей, значит это своя машина, и файлы лежат рядом.

  Двойственность не «на всякий случай». На Vercel файловой системы между
  запусками нет вовсе, и без ведра сайт там теряет вложения молча. А на
  своём сервере ведро не нужно: лишняя внешняя зависимость и лишний счёт
  ради того, что и так лежит на диске.

  Ключ снаружи — просто строка, и ни одна из трёх функций не обещает, что
  это путь. Ради этого файл и был так написан с самого начала: переезд в R2
  оказался переписыванием одного файла, а не поиском по всему проекту, где
  мы склеили путь руками.
*/

const ROOT = path.join(process.cwd(), "uploads");

const R2 = {
  account: process.env.R2_ACCOUNT_ID ?? "",
  key: process.env.R2_ACCESS_KEY_ID ?? "",
  secret: process.env.R2_SECRET_ACCESS_KEY ?? "",
  bucket: process.env.R2_BUCKET ?? "",
};

/** Работаем с ведром, только если задано всё четыре: половина хуже нуля. */
export const usesBucket = (): boolean =>
  Boolean(R2.account && R2.key && R2.secret && R2.bucket);

/*
  Клиент создаётся один раз и лениво.

  На Vercel каждый холодный запуск — это новый процесс, и создавать клиент
  на каждый файл значило бы платить рукопожатием за каждый снимок.
*/
let client: S3Client | null = null;

function bucket(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${R2.account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2.key, secretAccessKey: R2.secret },
    });
  }
  return client;
}

/** Ключ вида 2026-08/9f8e…c1.jpg. Имя случайное: присланному верить нельзя. */
function makeKey(ext: string): string {
  const now = new Date();
  const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${folder}/${randomUUID()}.${ext}`;
}

/** Кладёт файл в хранилище и возвращает ключ, по которому его потом найти. */
export async function put(data: Buffer, ext: string): Promise<string> {
  const key = makeKey(ext);

  if (usesBucket()) {
    await bucket().send(
      new PutObjectCommand({ Bucket: R2.bucket, Key: key, Body: data }),
    );
    return key;
  }

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
 *
 * Наружу отдаём браузерный ReadableStream, а не узловой: его ждёт Response,
 * и приводить тип на каждой стороне вызова — работа обработчика, которой у
 * него быть не должно. Диск отдаёт узловой поток, R2 — уже браузерный.
 */
export async function read(key: string): Promise<ReadableStream> {
  if (usesBucket()) {
    const object = await bucket().send(
      new GetObjectCommand({ Bucket: R2.bucket, Key: key }),
    );
    const body = object.Body;
    if (!body) throw new Error(`В ведре нет файла: ${key}`);
    return body.transformToWebStream();
  }

  const target = resolve(key);

  /*
    Проверяем наличие до того, как открыть поток.

    createReadStream ленив: на отсутствующем файле он спокойно возвращает
    поток, и ENOENT прилетает потом, когда обработчик уже отдал заголовки
    и начал ответ. Снаружи это выглядит как оборванная картинка вместо
    честного 404 — а у ведра тот же случай падает сразу, на запросе.
    Драйверы за одним интерфейсом обязаны ошибаться одинаково, иначе
    интерфейс не общий.
  */
  await stat(target);

  return Readable.toWeb(createReadStream(target)) as unknown as ReadableStream;
}

/** Убирает файл. Молчит, если его уже нет: результат всё равно нужный. */
export async function remove(key: string): Promise<void> {
  if (usesBucket()) {
    try {
      await bucket().send(
        new DeleteObjectCommand({ Bucket: R2.bucket, Key: key }),
      );
    } catch {
      // Ведро на удаление отсутствующего и так не жалуется, но сеть может.
    }
    return;
  }

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

  Для ведра эта проверка не нужна: там ключ — это ключ, а не путь, и выйти
  им за пределы ведра некуда.
*/
function resolve(key: string): string {
  const target = path.resolve(ROOT, key);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    throw new Error(`Ключ ведёт наружу хранилища: ${key}`);
  }
  return target;
}
