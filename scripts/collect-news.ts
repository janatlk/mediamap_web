/**
 * Обход лент дайджеста. Запускается по расписанию.
 *
 *   npm run news:collect
 *
 * Ошибка отдельной ленты не роняет обход: она попадает в её строку и видна
 * в панели. Ненулевой код возврата — только если не удалось вообще ничего,
 * чтобы cron мог отличить «часть источников молчит» от «сборщик сломан».
 */

import { collectNews } from "../src/server/news-collect";
import { db } from "../src/lib/db";

async function main(): Promise<void> {
  const report = await collectNews();

  for (const source of report.sources) {
    console.log(
      source.ok
        ? `${source.name}: в ленте ${source.found}, подошло ${source.kept}, новых ${source.added}`
        : `${source.name}: ошибка — ${source.error}`,
    );
  }

  const seconds = (
    (report.finishedAt.getTime() - report.startedAt.getTime()) /
    1000
  ).toFixed(1);
  const working = report.sources.filter((item) => item.ok).length;

  console.log(
    `итого: новых ${report.added}, источников ${working} из ${report.sources.length}, ${seconds} с`,
  );

  if (report.sources.length > 0 && working === 0) {
    console.error("ни один источник не ответил");
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
