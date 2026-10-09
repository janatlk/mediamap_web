/**
 * Проверка уже принятых заявок на QR-коды.
 *
 *   npm run qr:scan            — все заявки со снимками, которых не смотрели
 *   npm run qr:scan MM-2026-0066   — одну
 *
 * Новые заявки проверяются сами при подаче. Этот запуск нужен для тех, что
 * пришли раньше: у них отметки о проверке нет, и без него снимок с кодом
 * остался бы на странице случая открытым.
 */

// Адрес ML-сервиса живёт в .env. Запуск идёт мимо Next, который читает его
// сам, — без этой строки сервис считается выключенным и смотреть снимки
// было бы нечем.
import "dotenv/config";

import { db } from "../src/lib/db";
import { ATTACHMENT_KIND } from "../src/lib/enums";
import { scanAttachments } from "../src/server/qr-scan";

async function main(): Promise<void> {
  const only = process.argv[2];

  const reports = await db.report.findMany({
    where: {
      ...(only ? { publicId: only } : {}),
      attachments: { some: { kind: ATTACHMENT_KIND.IMAGE, qrCheckedAt: null } },
    },
    select: { id: true, publicId: true },
    orderBy: { createdAt: "desc" },
  });

  if (reports.length === 0) {
    console.log("нечего смотреть: все снимки уже проверены");
    return;
  }

  let withCodes = 0;
  for (const report of reports) {
    const found = await scanAttachments(report.id);
    if (found.length === 0) {
      console.log(`${report.publicId}: кодов нет`);
      continue;
    }

    withCodes += 1;
    for (const item of found) {
      console.log(`${report.publicId}: ${item.finding.summary}`);
    }
  }

  console.log(`\nпросмотрено заявок: ${reports.length}, с кодами: ${withCodes}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
