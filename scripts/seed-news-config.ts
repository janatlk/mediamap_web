/**
 * Первое заполнение настроек сборщика: источники и ключевые слова.
 *
 *   npm run news:seed
 *
 * Только добавляет. Уже заведённое не трогает и ничего не удаляет: список
 * ведёт администратор, и сид, затирающий его правки, был бы ловушкой —
 * запустили после обновления, и половина настроек уехала обратно.
 */

import { db } from "../src/lib/db";
import { DEFAULT_KEYWORDS, DEFAULT_SOURCES } from "../src/lib/news-defaults";

async function main(): Promise<void> {
  let sources = 0;
  for (const source of DEFAULT_SOURCES) {
    const created = await db.newsSource.upsert({
      where: { feedUrl: source.feedUrl },
      create: { ...source, takeAll: source.takeAll ?? false },
      update: {},
      select: { createdAt: true, updatedAt: true },
    });
    // createdAt === updatedAt только у той записи, которую мы сейчас завели.
    if (created.createdAt.getTime() === created.updatedAt.getTime()) sources += 1;
  }

  let words = 0;
  for (const [lang, list] of Object.entries(DEFAULT_KEYWORDS)) {
    for (const word of list) {
      const before = await db.newsKeyword.findUnique({
        where: { lang_word: { lang, word } },
        select: { id: true },
      });
      if (before) continue;
      await db.newsKeyword.create({ data: { lang, word } });
      words += 1;
    }
  }

  console.log(`источников добавлено: ${sources}`);
  console.log(`ключевых слов добавлено: ${words}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
