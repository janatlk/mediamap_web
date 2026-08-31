"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { ruleFor } from "@/lib/attachment-rules";
import { ATTACHMENT_KIND, REPORT_STATUS } from "@/lib/enums";
import { reportSchema, today } from "@/lib/report-schema";
import type { ViolationSlug } from "@/lib/i18n";
import { assess, type AssessRun } from "./ai-review";
import { recordCheck } from "./ai-journal";
import { attachTo, discard, filesFrom, prepare } from "./attachments";
import { takeSubmitSlot } from "./rate-limit";

// Приём сообщения о нарушении. Первая и пока единственная операция записи
// на сайте, поэтому здесь же заведён весь порядок: проверка, номер, статус.

// Успеха здесь нет: после записи уводим на отдельную страницу. Экран
// «принято» — это своя страница со своим адресом, а не другое состояние
// формы: его можно сохранить в закладки и вернуться позже за решением.
export type SubmitState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

/** Ошибка, которая относится ко всей форме, а не к какому-то полю. */
const wholeForm = (message: string, form: FormData): SubmitState => ({
  status: "error",
  errors: { form: message },
  values: submitted(form),
});

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

/**
 * Дата из формы во время.
 *
 * Полдень по UTC, а не полночь. Полночь при показе в часовом поясе западнее
 * Гринвича съезжает на сутки назад, и случай, помеченный первым числом,
 * читался бы как случившийся тридцать первого. Полдень такого сдвига не даёт
 * ни в одном обитаемом поясе.
 */
const asDate = (value: string): Date => new Date(`${value}T12:00:00Z`);

/** Ошибка уникальности — значит номер увели, пробуем следующий. */
const isDuplicateId = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const KEEP_ON_ERROR = [
  "typeSlug",
  "link",
  "story",
  "city",
  "regionCode",
  "happenedAt",
] as const;

/** Что вернуть в форму, чтобы человек не набирал всё заново. */
const submitted = (form: FormData): Record<string, string> =>
  Object.fromEntries(
    KEEP_ON_ERROR.map((field) => [field, String(form.get(field) ?? "")]),
  );

/** Всё, что мы знаем о сообщении, кроме публичного номера. */
type NewReport = Omit<Prisma.ReportUncheckedCreateInput, "publicId">;

/** Записывает сообщение, подбирая свободный номер. Возвращает его id. */
async function createReport(fields: NewReport): Promise<number> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = await nextPublicId();
    try {
      const row = await db.report.create({
        data: { publicId, ...fields },
        select: { id: true },
      });
      return row.id;
    } catch (error) {
      if (!isDuplicateId(error)) throw error;
    }
  }

  throw new Error("Не удалось подобрать свободный номер сообщения");
}

/*
  Первая картинка, которую модель сможет прочитать.

  Раньше вложения не отправлялись вовсе, и заявка «мошенническая схема, на
  скриншоте» приходила к модели одной этой фразой — без скриншота. Модель
  честно отвечала, что содержимое ей не показали, и это был правильный ответ
  на неправильно заданный вопрос.

  Видео не берём: сервис разбирает картинки, а речь из видео вытаскивается
  другим путём и только по ссылке. Слишком большой файл тоже пропускаем —
  base64 раздувает его ещё на треть, и запрос упрётся в предел раньше, чем
  принесёт пользу.
*/
const IMAGE_FOR_MODEL_BYTES = 4 * 1024 * 1024;

async function readableImage(
  files: File[],
): Promise<{ base64: string; mime: string } | undefined> {
  const image = files.find(
    (file) =>
      ruleFor(file.type)?.kind === ATTACHMENT_KIND.IMAGE &&
      file.size <= IMAGE_FOR_MODEL_BYTES,
  );
  if (!image) return undefined;

  const bytes = Buffer.from(await image.arrayBuffer());
  return { base64: bytes.toString("base64"), mime: image.type };
}

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
    regionCode: form.get("regionCode") ?? "",
    happenedAt: form.get("happenedAt") ?? "",
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

  /*
    Частоту считаем ПОСЛЕ проверки полей, а не до.

    Раньше было наоборот — чтобы не разбирать сорок мегабайт вложений ради
    отказа. Но теперь пауза наступает уже на четвёртой отправке, и человек,
    дважды промахнувшийся мимо обязательного поля, тратил бы на опечатки те
    же попытки, что и спамер. Файлы всё равно разбираются ниже, после этой
    проверки, так что лишней работы не прибавилось.
  */
  const slot = await takeSubmitSlot();
  if (!slot.ok) {
    return wholeForm(`tooOften:${slot.seconds}`, form);
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
  const run = await assess({
    story: data.story,
    chosenType: data.typeSlug as ViolationSlug,
    hasLink: Boolean(data.link),
    link: data.link || undefined,
    // Читаем прямо из формы, не дожидаясь записи в хранилище: байты уже здесь,
    // а лишний круг через диск ничего не добавляет.
    image: await readableImage(filesFrom(form, "files")),
  });
  const assessment = run.assessment;

  /*
    Кто подал, если человек был в аккаунте.

    Не проставлялось вовсе — и аккаунт получался бесполезным: сообщения
    привязывались только к браузеру, а страница «История» у вошедшего всегда
    была пуста, хотя он подавал их сам и только что.

    Анонимности это не отменяет: у не вошедшего остаётся null, и это по-
    прежнему основной путь.
  */
  const author = await currentUser();

  const fields = {
    authorId: author?.id ?? null,
    violationTypeId: type.id,
    mediaLink: data.link ? data.link : null,
    authorComment: data.story,
    city: data.city ? data.city : null,
    regionCode: data.regionCode ? data.regionCode : null,

    // Когда произошло. Пусто в форме — значит сегодня: поле подставлено
    // сегодняшним числом, и не тронуть его — это ответ, а не молчание.
    happenedAt: asDate(data.happenedAt || today()),
    // Публикуется сообщение только после проверки живым человеком.
    status: REPORT_STATUS.PENDING,

    // Черновик заголовка от модели. Проверяющий его правит перед публикацией.
    headline: assessment.details?.headline ?? null,

    aiVerdict: assessment.verdict,
    aiConfidence: assessment.confidence,
    // У модели обоснование словами, у словаря — перечень примет.
    aiSummary: assessment.details?.explanation || assessment.reasons.join(","),
    aiSource: assessment.source,
    aiCheckedAt: new Date(),
    // Ответ по каждому виду отдельно — из него собирается вывод для
    // заявителя. У разбора по словам такого нет, там остаётся пусто.
    aiTypeChecks: assessment.details?.checks
      ? JSON.stringify(assessment.details.checks)
      : null,
    // Что модель списала с картинки. Без этого вердикт по снимку нечем
    // проверить: проверяющий видит вывод и не видит, из чего он сделан.
    aiExtractedText: assessment.details?.extractedText || null,
    // По чему судили. Заявителю это говорят на странице прямым текстом.
    aiBasis: run.basis,
    // Личный ключ страницы «принято». Случайный, потому что номер
    // MM-2026-0001 угадывается с первой попытки.
    receiptToken: randomUUID(),
  };

  // Файлы кладём в хранилище до записи: сообщение без снимка ещё можно
  // рассмотреть, а запись со ссылкой на непоявившийся файл — уже нет.
  const files = await prepare(filesFrom(form, "files"));
  if (!files.ok) {
    return { status: "error", errors: { files: files.error }, values: submitted(form) };
  }

  let reportId: number;

  // Три попытки на случай, если номер займут между запросом и вставкой.
  try {
    reportId = await createReport(fields);
  } catch (error) {
    // Сообщения не будет — значит и файлам лежать не за чем.
    await discard(files.items);
    throw error;
  }

  await attachTo(reportId, files.items);
  await recordCheck(reportId, run, data.typeSlug);

  // redirect бросает своё исключение, поэтому вызываем его последним:
  // раньше его перехватила бы проверка на дубль номера.
  redirect(`/${lang}/report/sent/${fields.receiptToken}`);
}
