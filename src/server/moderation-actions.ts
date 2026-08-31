"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { requireStaff } from "@/lib/guard";
import { notifyReporter, whatChanged } from "./report-notifications";
import { VIOLATION_SLUGS } from "@/lib/i18n";

// Решение по сообщению. Единственное место, где статус меняется.

type Decision = typeof REPORT_STATUS.APPROVED | typeof REPORT_STATUS.REJECTED;

/**
 * Вид нарушения из формы.
 *
 * Пустая строка значит «не менял» — тогда остаётся оценка модели. Всё, чего
 * нет в таксономии, отбрасываем молча: поле приходит по сети, и доверять
 * ему нельзя, даже когда рядом сидит свой же сотрудник.
 */
function readVerdict(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (value === "unclear") return value;
  return (VIOLATION_SLUGS as readonly string[]).includes(value) ? value : null;
}

/**
 * Уверенность из формы: проценты снаружи, доля внутри.
 *
 * Процентами, потому что проверяющий читает на карточке «99%», а не «0.99»,
 * и вводить он будет то же самое число, которое видит.
 */
function readConfidence(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const percent = Number(value.replace(",", "."));
  if (!Number.isFinite(percent)) return null;

  return Math.min(100, Math.max(0, percent)) / 100;
}

async function decide(form: FormData, decision: Decision) {
  // Проверка доступа здесь, а не только на странице: действие вызывается
  // по сети и своей страницей не защищено.
  const user = await requireStaff();

  const id = Number(form.get("id"));

  // Что было до правки — чтобы понять, есть ли о чём извещать заявителя.
  // Проверяющий сохраняет карточку по нескольку раз, поправляя заголовок,
  // и письмо на каждое нажатие было бы наказанием за аккуратность.
  const before = await db.report.findUnique({
    where: { id },
    select: { status: true, moderatorComment: true },
  });

  const note = String(form.get("note") ?? "");
  const headline = String(form.get("headline") ?? "");
  const summary = String(form.get("summary") ?? "").trim();

  await db.report.update({
    where: { id },
    data: {
      status: decision,
      // Заголовок правится тут же, одной формой с решением: отдельная кнопка
      // «сохранить заголовок» означала бы, что о ней забудут.
      headline: headline.trim() || null,
      moderatorComment: note.trim() || null,

      // Правки поверх модели. Оценку модели не трогаем — см. схему.
      reviewVerdict: readVerdict(form.get("verdict")),
      reviewConfidence: readConfidence(form.get("confidence")),
      reviewSummary: summary || null,

      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  // Письмо — после записи и только если решение вправду поменялось. Ошибку
  // почты notifyReporter гасит сам: решение уже принято, и падать из-за
  // неотправленного письма ему незачем.
  if (before) {
    await notifyReporter(
      id,
      whatChanged(before, { status: decision, moderatorComment: note.trim() || null }),
    );
  }

  // Публичные страницы собраны заранее — после решения их надо пересобрать,
  // иначе подтверждённый случай появится только через пять минут.
  revalidatePath("/", "layout");
}

export async function approveReport(form: FormData): Promise<void> {
  await decide(form, REPORT_STATUS.APPROVED);
}

export async function rejectReport(form: FormData): Promise<void> {
  await decide(form, REPORT_STATUS.REJECTED);
}

/**
 * Отменить решение.
 *
 * Ошиблись кнопкой — не повод заводить сообщение заново. Отметки о проверке
 * стираем: иначе в журнале останется, будто дело рассмотрено, хотя оно снова
 * в очереди. Заметку модератора и его правки оставляем — они объясняют, что
 * случилось, и переписывать их заново после возврата незачем.
 */
export async function reopenReport(form: FormData): Promise<void> {
  await requireStaff();

  await db.report.update({
    where: { id: Number(form.get("id")) },
    data: {
      status: REPORT_STATUS.PENDING,
      reviewedById: null,
      reviewedAt: null,
    },
  });

  revalidatePath("/", "layout");
}

/*
  Показывать ли приложенный файл на опубликованной странице случая.

  Решение поимённое, по каждому файлу, и по умолчанию — нет. Заявитель
  присылал снимок нам на проверку, а на снимке переписки бывает его
  собственное имя, номер телефона, список контактов. Согласие в форме
  сказано «без моих личных данных» — а снимок как раз ими и полон, и
  распространить то согласие на файлы значило бы прочитать его шире, чем
  человек его давал.

  Поэтому здесь ровно одно действие, и включает его человек, глядя на сам
  файл.
*/
export async function toggleAttachment(form: FormData): Promise<void> {
  await requireStaff();

  const id = String(form.get("id") ?? "");
  if (!id) return;

  const file = await db.attachment.findUnique({
    where: { id },
    select: { public: true },
  });
  if (!file) return;

  await db.attachment.update({ where: { id }, data: { public: !file.public } });

  // Тип «page», а не «layout»: без него панель уезжает на случайную
  // страницу из кэша маршрутизатора — на этом уже обжигались дважды.
  revalidatePath("/admin", "page");
  revalidatePath("/[lang]/cases/[id]", "page");
}
