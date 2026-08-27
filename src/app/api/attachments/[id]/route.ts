import { NextResponse, type NextRequest } from "next/server";

import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff, REPORT_STATUS } from "@/lib/enums";
import { read } from "@/server/storage";

/*
  Раздача приложенных файлов.

  Из public их раздавал бы сам Next, никого не спрашивая, — и снимок из
  ещё не рассмотренного сообщения был бы открыт любому, кто угадает адрес.
  Поэтому файлы лежат вне public, а решение принимается здесь.

  Кому можно:
    * сотруднику — всегда, он их и проверяет;
    * всем — если случай подтверждён и опубликован;
    * подавшему — по личному ключу в ?t=, тому же, что открывает страницу
      «сообщение принято». Другого способа узнать себя у него нет: имени и
      почты мы не спрашивали.

  Чужому отвечаем 404, а не 403: «здесь есть файл, но вам нельзя» — это
  тоже ответ, и по нему можно перебором составить список сообщений.
*/

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const file = await db.attachment.findUnique({
    where: { id },
    select: {
      key: true,
      mime: true,
      size: true,
      report: { select: { status: true, receiptToken: true } },
    },
  });

  if (!file) return new NextResponse(null, { status: 404 });

  if (!(await mayRead(request, file.report))) {
    return new NextResponse(null, { status: 404 });
  }

  /*
    Файла может не оказаться: ключ есть в базе, а в хранилище пусто. На
    диске так бывает после переноса, в ведре — если файл убрали мимо нас.
    Отвечаем 404, как чужому: «файл есть, но не отдаётся» — тоже ответ.
  */
  let stream: ReadableStream;
  try {
    stream = await read(file.key);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(stream, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      // Опубликованное можно и закэшировать, остальное — никогда: доступ
      // держится на ключе, а кэш про ключи ничего не знает.
      "Cache-Control":
        file.report.status === REPORT_STATUS.APPROVED
          ? "public, max-age=3600"
          : "private, no-store",
      // Браузер не должен угадывать тип сам: угаданный HTML он выполнит.
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function mayRead(
  request: NextRequest,
  report: { status: string; receiptToken: string | null },
): Promise<boolean> {
  if (report.status === REPORT_STATUS.APPROVED) return true;

  const token = request.nextUrl.searchParams.get("t");
  if (token && report.receiptToken && token === report.receiptToken) return true;

  const user = await currentUser();
  return user !== null && isStaff(user.role);
}
