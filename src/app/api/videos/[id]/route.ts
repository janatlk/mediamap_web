import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { filePath } from "@/server/storage";

/*
  Раздача роликов.

  Файлы лежат вне public (см. src/server/storage.ts), поэтому отдаёт их
  обработчик. Проверять тут нечего — ролики показываются на главной всем, —
  но без своего обработчика их и не достать.

  Главное здесь — Range. Браузер при перемотке и телефоны при любом
  воспроизведении просят кусок файла, а не весь; сервер, который всегда
  отвечает целиком и кодом 200, на iPhone просто не играет.
*/

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = await db.video.findUnique({
    where: { id: Number.parseInt(id, 10) || 0 },
    select: { key: true, mime: true, size: true, posterKey: true, published: true },
  });

  if (!row || !row.published) return new NextResponse(null, { status: 404 });

  // ?poster — тот же ролик, но его обложка: отдельный обработчик ради
  // одного файла заводить незачем.
  const poster = request.nextUrl.searchParams.has("poster");
  if (poster && !row.posterKey) return new NextResponse(null, { status: 404 });

  const key = poster ? row.posterKey! : row.key;
  const type = poster ? "image/jpeg" : row.mime;
  const size = poster ? null : row.size;

  const common = {
    "Content-Type": type,
    // Содержимое по этому адресу не меняется: правка ролика — это новый
    // файл и новая запись.
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  const range = size ? parseRange(request.headers.get("range"), size) : null;

  if (range) {
    const stream = Readable.toWeb(
      createReadStream(filePath(key), { start: range.start, end: range.end }),
    ) as unknown as ReadableStream;

    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...common,
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
        "Content-Length": String(range.end - range.start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath(key))) as unknown as ReadableStream;

  return new NextResponse(stream, {
    headers: size ? { ...common, "Content-Length": String(size) } : common,
  });
}

/** Разбирает заголовок Range. null — его нет или он кривой: отдадим целиком. */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const [, from, to] = match;
  // «bytes=-500» — последние 500 байт, так тоже просят.
  const start = from ? Number.parseInt(from, 10) : Math.max(0, size - Number.parseInt(to, 10));
  const end = from && to ? Number.parseInt(to, 10) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}
