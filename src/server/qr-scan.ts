import { readFile } from "node:fs/promises";

import { db } from "@/lib/db";
import { ATTACHMENT_KIND } from "@/lib/enums";
import { filePath } from "./storage";
import { mlEnabled, readQr, type QrFinding } from "./ml-service";

/*
  Проверка приложенных снимков на QR-коды.

  Зачем вообще. Код на картинке — это ссылка, которую человек не видит
  глазами. В заявках про мошенничество он встречается сплошь и рядом:
  «отсканируйте и получите выплату». Проверяющий сейчас узнаёт, куда он
  ведёт, одним способом — наводит свой телефон на код из чужого сообщения.
  Этого делать нельзя, и за него это делает сервис.

  Когда. После приёма заявки, в фоне: заявитель не должен ждать, пока мы
  сходим по чужой ссылке. Поэтому же любая неудача здесь остаётся в
  журнале и ничего не роняет — кода на снимке может и не быть.

  Что делаем с результатом. Строка с расшифровкой ложится в панель
  проверяющему, а на опубликованной странице такой снимок закрывается
  предупреждением: подсунуть посетителю чужой код мы не вправе.
*/

/** Сколько снимков смотрим у одной заявки. Больше — редкость и не нужно. */
const MAX_IMAGES = 5;

/** Потолок на файл: больше декодеру не нужно, да и сервис столько не возьмёт. */
const MAX_BYTES = 12 * 1024 * 1024;

type Scanned = { id: string; finding: QrFinding };

/**
 * Смотрит снимки заявки и записывает находки.
 *
 * Возвращает те снимки, где коды нашлись, — это нужно дозаполнению старых
 * заявок, которое печатает отчёт. Обычный вызов результат не читает.
 */
export async function scanAttachments(reportId: number): Promise<Scanned[]> {
  if (!mlEnabled()) return [];

  const images = await db.attachment.findMany({
    where: { reportId, kind: ATTACHMENT_KIND.IMAGE, qrCheckedAt: null },
    orderBy: { createdAt: "asc" },
    take: MAX_IMAGES,
    select: { id: true, key: true, mime: true, size: true },
  });

  const found: Scanned[] = [];

  for (const image of images) {
    if (image.size > MAX_BYTES) continue;

    try {
      const bytes = await readFile(filePath(image.key));
      const finding = await readQr({
        base64: bytes.toString("base64"),
        mime: image.mime,
      });

      await db.attachment.update({
        where: { id: image.id },
        data: {
          // Пусто пишем как null, а не как пустую строку: «кода нет» и
          // «код есть, но расшифровка пустая» — разные вещи, и первое не
          // должно включать предупреждение на странице случая.
          qrSummary: finding.summary || null,
          qrCodes: finding.codes.length ? JSON.stringify(finding.codes) : null,
          qrCheckedAt: new Date(),
        },
      });

      if (finding.codes.length) found.push({ id: image.id, finding });
    } catch (error) {
      // Сервис не ответил, файл не прочитался — отметку о проверке не
      // ставим, чтобы снимок попал под неё в следующий раз.
      console.error(`QR: снимок ${image.id} не проверен`, error);
    }
  }

  return found;
}

/** Разбор сохранённого JSON. Кривую запись считаем отсутствующей. */
export function qrCodesOf(raw: string | null): QrFinding["codes"] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QrFinding["codes"];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
