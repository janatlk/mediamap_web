import { db } from "@/lib/db";

import type { AssessRun } from "./ai-review";

/*
  Журнал оценок: по строке на каждую попытку, включая неудачные.

  Аналитика в панели считается по нему, а не по полям в Report. В Report
  лежит текущая оценка, одна и последняя; на вопрос «как часто сервис не
  отвечает и не поехала ли модель» она не отвечает никак.
*/

/**
 * Пишет строку журнала.
 *
 * Ошибку глотает намеренно: сообщение уже принято, файлы разложены, и
 * ронять подачу из-за несохранившейся строки статистики нельзя. Потеря
 * такой строки — испорченная цифра в отчёте, а не потерянное обращение.
 */
export async function recordCheck(
  reportId: number,
  run: AssessRun,
  chosenType: string,
): Promise<void> {
  const { assessment } = run;
  const details = assessment.details;

  try {
    await db.aiCheck.create({
      data: {
        reportId,
        source: assessment.source,
        model: details?.modelVersion ?? null,
        verdict: run.ok ? assessment.verdict : null,
        confidence: run.ok ? assessment.confidence : null,
        sublabel: details?.sublabel ?? null,
        act: details?.act ?? null,
        claim: details?.claim ?? null,
        factVerdict: details?.factVerdict ?? null,
        // Массивов в SQLite нет, а искать по ссылкам нам и не нужно.
        sources: details?.sources.length ? details.sources.join("\n") : null,
        chosenType,
        latencyMs: run.latencyMs,
        ok: run.ok,
        error: run.error,
      },
    });
  } catch (error) {
    console.error("не удалось записать оценку в журнал", error);
  }
}
