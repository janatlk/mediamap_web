import { NextResponse } from "next/server";

import { ruleFor } from "@/lib/attachment-rules";
import { ATTACHMENT_KIND } from "@/lib/enums";
import { takeCheckSlot } from "@/server/rate-limit";
import { examineImage, provenanceEnabled } from "@/server/provenance";

/*
  Проверка изображения из открытой рубрики.

  Обработчик, а не серверное действие, и по той же причине, по которой сюда
  переехал перевод новостей: серверные действия в Next идут одной очередью с
  переходами по сайту, а разбор с наблюдениями модели занимает секунды. С
  действием сайт на это время замирал бы.

  Файл нигде не сохраняется. Он приходит, разбирается в памяти и уходит; на
  сервисе его тоже кладут во временную папку, которая удаляется сразу.
  Рубрика открыта всем и без входа — держать чужие картинки у себя мы не
  подписывались, а обещание «мы её не храним» стоит того, чтобы быть правдой.
*/

/** Потолок на файл. Столько же принимает и сервис. */
const MAX_BYTES = 12 * 1024 * 1024;

const fail = (error: string, status: number) =>
  NextResponse.json({ status: "error", error }, { status });

export async function POST(request: Request): Promise<NextResponse> {
  if (!provenanceEnabled()) return fail("off", 503);

  // Частота считается до чтения файла: смысл ограничения в том, чтобы не
  // тратить работу, а чтение двенадцати мегабайт — уже работа.
  const slot = await takeCheckSlot();
  if (!slot.ok) {
    return NextResponse.json(
      { status: "error", error: "wait", seconds: slot.seconds },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("bad", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("bad", 400);
  if (file.size === 0) return fail("empty", 400);
  if (file.size > MAX_BYTES) return fail("big", 413);

  /*
    Тип берём из заголовка файла, а не из расширения имени: имя присылает
    браузер, и «фото.jpg» ничего не обещает. Проверяем по тому же белому
    списку, что и вложения к сообщениям, — заводить второй список значит
    однажды разойтись с первым.
  */
  const rule = ruleFor(file.type);
  if (!rule || rule.kind !== ATTACHMENT_KIND.IMAGE) return fail("type", 415);

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const result = await examineImage(bytes, file.type);
    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    // В журнал — с причиной, человеку — что проверка не вышла. Молча вернуть
    // «следов не нашли» нельзя: это выглядело бы ответом, а не сбоем.
    console.error("разбор происхождения не удался:", error);
    return fail("failed", 502);
  }
}
