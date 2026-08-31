import { NextResponse, type NextRequest } from "next/server";
import { Readable } from "node:stream";

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
    * всем — если случай опубликован И файл отмечен как публичный;
    * подавшему — по личному ключу в ?t=, тому же, что открывает страницу
      «сообщение принято». Другого способа узнать себя у него нет: имени и
      почты мы не спрашивали.

  Про отметку отдельно. Раньше публичным файл делал один статус случая: как
  только его подтверждали, снимок открывался всякому, кто знает адрес.
  Ссылок на него нигде не стояло, и это выглядело безопасным — но «никто не
  догадается» защитой не является, а на снимке переписки бывает имя и
  телефон заявителя. Теперь мало подтвердить случай: файл должен быть
  отмечен человеком поимённо.

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
      public: true,
      report: { select: { status: true, receiptToken: true } },
    },
  });

  if (!file) return new NextResponse(null, { status: 404 });

  if (!(await mayRead(request, file))) {
    return new NextResponse(null, { status: 404 });
  }

  // Node отдаёт свой ReadableStream, а Response ждёт браузерный. Это один
  // и тот же поток, расходятся только описания типов.
  const stream = Readable.toWeb(read(file.key)) as unknown as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      // Опубликованное можно и закэшировать, остальное — никогда: доступ
      // держится на ключе, а кэш про ключи ничего не знает.
      // Кэшируем только то, что и так открыто всем. Всё остальное держится
      // на ключе или на сессии, а кэш про них ничего не знает.
      "Cache-Control":
        file.public && file.report.status === REPORT_STATUS.APPROVED
          ? "public, max-age=3600"
          : "private, no-store",
      // Браузер не должен угадывать тип сам: угаданный HTML он выполнит.
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function mayRead(
  request: NextRequest,
  file: {
    public: boolean;
    report: { status: string; receiptToken: string | null };
  },
): Promise<boolean> {
  if (file.public && file.report.status === REPORT_STATUS.APPROVED) return true;

  const token = request.nextUrl.searchParams.get("t");
  if (token && file.report.receiptToken && token === file.report.receiptToken) {
    return true;
  }

  const user = await currentUser();
  return user !== null && isStaff(user.role);
}
