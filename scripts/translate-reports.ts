/**
 * Переводы разборов и заметок на языки сайта для уже поданных сообщений.
 *
 *   npx tsx scripts/translate-reports.ts
 *
 * Новые сообщения переводятся сами, после разбора и после решения. Этот
 * прогон нужен один раз — для записей, сделанных до перевода, — и после
 * смены модели перевода. Уже переведённое берётся из памяти, поэтому
 * повторный запуск ничего не пересчитывает.
 */

import "dotenv/config";

import { db } from "../src/lib/db";
import { warmReport } from "../src/server/text-translation";

async function main(): Promise<void> {
  const rows = await db.report.findMany({ select: { id: true, publicId: true }, orderBy: { id: "asc" } });

  for (const row of rows) {
    const started = Date.now();
    await warmReport(row.id);
    console.log(`${row.publicId}: ${((Date.now() - started) / 1000).toFixed(1)} с`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
