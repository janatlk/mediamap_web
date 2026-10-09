/**
 * Переспросить модель по уже принятой заявке.
 *
 *   npm run report:reassess MM-2026-0066
 *
 * Нужен, когда разбор поменялся после подачи: появилось чтение QR-кодов,
 * поправились правила, обновилась модель. Оценка при подаче снимается один
 * раз, и заявка, пришедшая раньше, так и осталась бы с ответом, данным по
 * прежним сведениям.
 *
 * Решение человека не трогаем: ai* — это то, что сказала модель, а
 * review* — то, что решил проверяющий, и затирать второе первым нельзя.
 * Прежний ответ модели остаётся в журнале проверок: по нему считают, часто
 * ли она ошибается, и переспрос не должен этот след стирать.
 */

// Ключи и адрес ML-сервиса живут в .env, а запуск идёт мимо Next.
import "dotenv/config";

import { db } from "../src/lib/db";
import { ATTACHMENT_KIND } from "../src/lib/enums";
import type { ViolationSlug } from "../src/lib/i18n";
import { recordCheck } from "../src/server/ai-journal";
import { assess } from "../src/server/ai-review";
import { filePath } from "../src/server/storage";
import { warmReport } from "../src/server/text-translation";
import { readFile } from "node:fs/promises";

/** Столько же, сколько при подаче: больше модель по картинке не берёт. */
const IMAGE_FOR_MODEL_BYTES = 4 * 1024 * 1024;

async function main(): Promise<void> {
  const publicId = process.argv[2];
  if (!publicId) {
    console.error("нужен номер заявки: npm run report:reassess MM-2026-0066");
    process.exitCode = 1;
    return;
  }

  const report = await db.report.findUnique({
    where: { publicId },
    include: {
      violationType: { select: { slug: true } },
      attachments: {
        where: { kind: ATTACHMENT_KIND.IMAGE },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { key: true, mime: true, size: true },
      },
    },
  });

  if (!report) {
    console.error(`заявки ${publicId} нет`);
    process.exitCode = 1;
    return;
  }

  // Картинку берём ту же, что и при подаче: первую и только если модель её
  // осилит. Снимок обычно один, остальные — то же самое с другого угла.
  const picture = report.attachments[0];
  const image =
    picture && picture.size <= IMAGE_FOR_MODEL_BYTES
      ? {
          base64: (await readFile(filePath(picture.key))).toString("base64"),
          mime: picture.mime,
        }
      : undefined;

  const run = await assess({
    story: report.authorComment ?? "",
    chosenType: report.violationType.slug as ViolationSlug,
    hasLink: Boolean(report.mediaLink),
    link: report.mediaLink ?? undefined,
    image,
  });

  const assessment = run.assessment;

  await db.report.update({
    where: { id: report.id },
    data: {
      headline: assessment.details?.headline ?? report.headline,
      aiVerdict: assessment.verdict,
      aiConfidence: assessment.confidence,
      aiSummary: assessment.details?.explanation || assessment.reasons.join(","),
      aiSource: assessment.source,
      aiCheckedAt: new Date(),
      aiTypeChecks: assessment.details?.checks
        ? JSON.stringify(assessment.details.checks)
        : null,
      aiExtractedText: assessment.details?.extractedText || null,
      aiTerminology: assessment.details?.terminology || null,
      aiBasis: run.basis,
    },
  });

  await recordCheck(report.id, run, report.violationType.slug);

  // Разбор модель пишет по-английски — переводы готовим сразу, иначе
  // страница случая переведёт их при первом открытии и человек подождёт.
  await warmReport(report.id);

  console.log(`${publicId}: ${assessment.verdict} (${assessment.source}, по «${run.basis}»)`);
  if (!run.ok) console.log(`сбой разбора: ${run.error}`);
  console.log(`\n${assessment.details?.explanation || assessment.reasons.join(", ")}`);
  if (assessment.details?.extractedText) {
    console.log(`\nс картинки:\n${assessment.details.extractedText}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
