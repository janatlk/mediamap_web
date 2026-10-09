/**
 * Дозаполнение картинок у уже собранных заметок.
 *
 *   npm run news:images
 *
 * Сборщик берёт картинку при обходе лент, но заметки, собранные до
 * появления этого поля, остались без неё. Этот запуск ходит по ним один
 * раз и спрашивает страницу материала.
 *
 * Идёт по одной заметке, без спешки: это не срочная работа, а десяток
 * одновременных запросов к одному изданию выглядит со стороны как наплыв.
 */

import { db } from "../src/lib/db";
import { imageFromPage } from "../src/server/news-image";

/** Сколько заметок обрабатывать за запуск. */
const LIMIT = 300;

async function main(): Promise<void> {
  const rows = await db.newsItem.findMany({
    where: { image: null },
    orderBy: { publishedAt: "desc" },
    take: LIMIT,
    select: { id: true, link: true, title: true },
  });

  let found = 0;
  for (const row of rows) {
    const image = await imageFromPage(row.link);
    if (image) {
      await db.newsItem.update({ where: { id: row.id }, data: { image } });
      found += 1;
    }
    console.log(`${image ? "есть" : "нет "} · ${row.title.slice(0, 70)}`);
  }

  console.log(`\nпросмотрено ${rows.length}, картинок найдено ${found}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
