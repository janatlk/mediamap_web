"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { requireStaff } from "@/lib/guard";

// Решение по сообщению. Единственное место, где статус меняется.

type Decision = typeof REPORT_STATUS.APPROVED | typeof REPORT_STATUS.REJECTED;

async function decide(reportId: number, decision: Decision, note: string) {
  // Проверка доступа здесь, а не только на странице: действие вызывается
  // по сети и своей страницей не защищено.
  const user = await requireStaff();

  await db.report.update({
    where: { id: reportId },
    data: {
      status: decision,
      moderatorComment: note.trim() || null,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  // Публичные страницы собраны заранее — после решения их надо пересобрать,
  // иначе подтверждённый случай появится только через пять минут.
  revalidatePath("/", "layout");
}

export async function approveReport(form: FormData): Promise<void> {
  await decide(
    Number(form.get("id")),
    REPORT_STATUS.APPROVED,
    String(form.get("note") ?? ""),
  );
}

export async function rejectReport(form: FormData): Promise<void> {
  await decide(
    Number(form.get("id")),
    REPORT_STATUS.REJECTED,
    String(form.get("note") ?? ""),
  );
}
