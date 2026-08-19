"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { reportSchema } from "@/lib/report-schema";
import type { ViolationSlug } from "@/lib/i18n";
import { assess, type Assessment } from "./ai-review";

// Приём сообщения о нарушении. Первая и пока единственная операция записи
// на сайте, поэтому здесь же заведён весь порядок: проверка, номер, статус.

// Успеха здесь нет: после записи уводим на отдельную страницу. Экран
// «принято» — это своя страница со своим адресом, а не другое состояние
// формы: его можно сохранить в закладки и вернуться позже за решением.
export type SubmitState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

/**
 * Публичный номер сообщения: MM-2026-0042.
 *
 * Считаем от последнего номера этого года. Два одновременных сообщения
 * теоретически могут запросить один номер — от этого страхует уникальный
 * индекс и повтор попытки в submitReport.
 */
async function nextPublicId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MM-${year}-`;

  const last = await db.report.findFirst({
    where: { publicId: { startsWith: prefix } },
    orderBy: { publicId: "desc" },
    select: { publicId: true },
  });

  const lastNumber = last ? Number.parseInt(last.publicId.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

/** Ошибка уникальности — значит номер увели, пробуем следующий. */
const isDuplicateId = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const KEEP_ON_ERROR = ["typeSlug", "link", "story", "city"] as const;

/** Что вернуть в форму, чтобы человек не набирал всё заново. */
const submitted = (form: FormData): Record<string, string> =>
  Object.fromEntries(
    KEEP_ON_ERROR.map((field) => [field, String(form.get(field) ?? "")]),
  );

export async function submitReport(
  _previous: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  // Язык нужен, чтобы увести на страницу «принято» на том же языке.
  const lang = String(form.get("lang") ?? "ru");

  const parsed = reportSchema.safeParse({
    typeSlug: form.get("typeSlug") ?? "",
    link: form.get("link") ?? "",
    story: form.get("story") ?? "",
    city: form.get("city") ?? "",
    consent: form.get("consent") ?? "",
    trap: form.get("trap") ?? "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      // Первая ошибка по полю важнее остальных: показывать три подряд незачем.
      errors[field] ??= issue.message;
    }
    return { status: "error", errors, values: submitted(form) };
  }

  const data = parsed.data;

  // Вид приходит из формы и может быть подменён. Сверяем с базой.
  const type = await db.violationType.findUnique({
    where: { slug: data.typeSlug },
    select: { id: true },
  });

  if (!type) {
    return {
      status: "error",
      errors: { typeSlug: "typeRequired" },
      values: submitted(form),
    };
  }

  // Предварительная оценка снимается сразу: она ничего не решает, но
  // задаёт порядок в очереди на проверку.
  const assessment = assess({
    story: data.story,
    chosenType: data.typeSlug as ViolationSlug,
    hasLink: Boolean(data.link),
  });

  const fields = {
    violationTypeId: type.id,
    mediaLink: data.link ? data.link : null,
    authorComment: data.story,
    city: data.city ? data.city : null,
    // Публикуется сообщение только после проверки живым человеком.
    status: REPORT_STATUS.PENDING,

    aiVerdict: assessment.verdict,
    aiConfidence: assessment.confidence,
    aiSummary: assessment.reasons.join(","),
    aiSource: assessment.source,
    aiCheckedAt: new Date(),
    // Личный ключ страницы «принято». Случайный, потому что номер
    // MM-2026-0001 угадывается с первой попытки.
    receiptToken: randomUUID(),
  };

  // Три попытки на случай, если номер займут между запросом и вставкой.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = await nextPublicId();
    try {
      await db.report.create({ data: { publicId, ...fields } });
      // redirect бросает своё исключение, поэтому вызываем его за пределами
      // try: внутри его перехватила бы проверка на дубль номера.
      break;
    } catch (error) {
      if (!isDuplicateId(error)) throw error;
      if (attempt === 2) {
        throw new Error("Не удалось подобрать свободный номер сообщения");
      }
    }
  }

  redirect(`/${lang}/report/sent/${fields.receiptToken}`);
}
