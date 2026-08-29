import { NextResponse } from "next/server";

import { isTranslationLang, translateNewsItem } from "@/server/translate";

/*
  Перевод заметки — обычным обработчиком, а не серверным действием.

  Действием он и был, и это оказалось ошибкой. Серверные действия в Next
  выполняются по очереди и делят её с переходами по сайту: пока действие в
  работе, нажатие на любую ссылку ждёт. NLLB считает перевод несколько
  секунд, а первый после запуска — до двадцати, пока грузится модель. Всё
  это время сайт для человека выглядел зависшим: он нажимал, ничего не
  происходило.

  Обычный запрос в эту очередь не встаёт. Страница остаётся живой, по ней
  можно ходить, а перевод приезжает, когда посчитается.

  Пишем в базу (запоминаем перевод), поэтому метод POST, а не GET: GET,
  меняющий данные, однажды выполнит за нас чужой предзагрузчик.
*/

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  const { id, lang } = (body ?? {}) as { id?: unknown; lang?: unknown };

  // Всё пришло из браузера — проверяем, а не доверяем.
  if (!Number.isInteger(id) || (id as number) <= 0) {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }
  if (typeof lang !== "string" || !isTranslationLang(lang)) {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  try {
    const text = await translateNewsItem(id as number, lang);
    return NextResponse.json({ status: "ok", text });
  } catch (error) {
    // В журнал — с причиной, человеку — что перевод не вышел. Показывать
    // ему «сервис ответил 503» незачем, а нам знать надо.
    console.error("перевод новости не удался:", error);
    return NextResponse.json({ status: "error" }, { status: 502 });
  }
}
