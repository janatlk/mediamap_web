/**
 * Наполняет базу данными прежнего сайта.
 *
 * Источник — prisma/seed-data.json, его готовит scripts/export-legacy.py.
 * Сид идемпотентен: повторный запуск обновляет записи, а не плодит копии.
 *
 * Запуск: npm run db:seed
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";

type SeedData = {
  violationTypes: { slug: string; sort: number }[];
  reports: {
    legacyId: number;
    lat: number;
    lng: number;
    regionCode: string;
    city: string;
    mediaLink: string | null;
    screenshot: string | null;
    authorComment: string | null;
    moderatorComment: string | null;
    status: string;
    typeSlug: string;
    createdAt: string | null;
  }[];
  news: {
    guid: string;
    title: string;
    link: string;
    snippet: string | null;
    source: string;
    publishedAt: string;
  }[];
};

/** Публичный номер заявки: MM-2026-0042. */
const publicId = (year: number, sequence: number) =>
  `MM-${year}-${String(sequence).padStart(4, "0")}`;

/**
 * Тяжесть прежняя база не хранила. Восстанавливать её выдумкой нельзя,
 * поэтому у перенесённых заявок она остаётся пустой — модератор проставит
 * её при следующем рассмотрении. Карта умеет показывать заявки без тяжести.
 */

async function main() {
  const raw = readFileSync(join(process.cwd(), "prisma", "seed-data.json"), "utf-8");
  const data = JSON.parse(raw) as SeedData;

  for (const type of data.violationTypes) {
    await db.violationType.upsert({
      where: { slug: type.slug },
      create: type,
      update: type,
    });
  }
  console.log(`типы нарушений: ${data.violationTypes.length}`);

  const typeIdBySlug = new Map(
    (await db.violationType.findMany({ select: { id: true, slug: true } })).map(
      (t) => [t.slug, t.id],
    ),
  );

  let sequence = 0;
  for (const report of data.reports) {
    const typeId = typeIdBySlug.get(report.typeSlug);
    if (typeId === undefined) {
      throw new Error(`Неизвестный тип нарушения: ${report.typeSlug}`);
    }

    const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();
    sequence += 1;
    const id = publicId(createdAt.getFullYear(), sequence);

    const fields = {
      lat: report.lat,
      lng: report.lng,
      regionCode: report.regionCode,
      city: report.city,
      mediaLink: report.mediaLink,
      screenshot: report.screenshot,
      authorComment: report.authorComment,
      moderatorComment: report.moderatorComment,
      status: report.status,
      violationTypeId: typeId,
      createdAt,
    };

    await db.report.upsert({
      where: { publicId: id },
      create: { publicId: id, ...fields },
      update: fields,
    });
  }
  console.log(`заявки: ${data.reports.length}`);

  // Виды, которых больше нет в наборе, удаляем — но только после того,
  // как все сообщения переставлены на актуальные. Иначе удаление увело бы
  // за собой связанные записи.
  const activeSlugs = data.violationTypes.map((type) => type.slug);
  const removed = await db.violationType.deleteMany({
    where: { slug: { notIn: activeSlugs } },
  });
  if (removed.count > 0) {
    console.log(`удалено устаревших видов: ${removed.count}`);
  }

  for (const item of data.news) {
    const fields = {
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: item.source,
      publishedAt: new Date(item.publishedAt),
    };
    await db.newsItem.upsert({
      where: { guid: item.guid },
      create: { guid: item.guid, ...fields },
      update: fields,
    });
  }
  console.log(`новости: ${data.news.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
