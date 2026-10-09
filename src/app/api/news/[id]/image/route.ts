import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/*
  Картинка заметки дайджеста.

  Чужой адрес картинки в разметку не ставим, а отдаём через себя. Причины
  две. Первая: страница тогда не рассказывает изданию, кто её читает, —
  браузер читателя за картинкой никуда не ходит. Вторая: часть изданий
  отдаёт картинку только по запросу со своего же сайта, и прямая ссылка в
  <img> ломалась бы пустым квадратом.

  Открытым пересыльщиком это не делает: адрес берётся из нашей базы по
  номеру заметки, а не из запроса. Произвольную ссылку сюда не подсунуть.
*/

/** Ждём недолго: пустое место в ленте лучше, чем ожидающая страница. */
const TIMEOUT_MS = 10_000;

/** Потолок размера. Обложка статьи в такое влезает с запасом. */
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const row = await db.newsItem.findUnique({
    where: { id: Number.parseInt(id, 10) || 0 },
    select: { image: true, link: true },
  });

  if (!row?.image) return new NextResponse(null, { status: 404 });

  try {
    const response = await fetch(row.image, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "MediaMapBot/1.0 (+https://mediamap.kg)",
        Accept: "image/*",
        // Издания, отдающие картинки только своим, смотрят на эту строку.
        Referer: row.link,
      },
      redirect: "follow",
    });

    const type = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (!response.ok || !type || !ALLOWED.has(type)) {
      return new NextResponse(null, { status: 404 });
    }

    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_BYTES)
      return new NextResponse(null, { status: 404 });

    return new NextResponse(body, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(body.byteLength),
        // Сутки у читателя, неделя у посредников: картинка к вышедшей
        // новости не меняется, а ходить за ней каждый раз незачем.
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    // Издание не ответило или оборвало соединение — показывать нечего.
    return new NextResponse(null, { status: 404 });
  }
}
