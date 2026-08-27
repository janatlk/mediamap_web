"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { NEEDS_REASON, SOURCE_STATUS } from "@/lib/enums";
import { requireStaff } from "@/lib/guard";

/*
  Действия над реестром источников. Единственное место, где ставится оценка.

  Все три действия требуют сотрудника — проверка здесь, а не только на
  странице: действие вызывается по сети и своей страницей не защищено.
*/

const STATUSES: string[] = Object.values(SOURCE_STATUS);

/**
 * Оценка источника.
 *
 * Обоснование обязательно для «чёрного списка» и «присмотреться». Это не
 * формальность: запись «аккаунту нельзя доверять» без единого слова о том,
 * за что, — обвинение, которое через полгода никто не сможет ни объяснить,
 * ни оспорить. Для «доверяем» и «ничего не утверждаем» обоснование
 * необязательно: там нечего оспаривать.
 */
export async function setSourceStatus(form: FormData) {
  const user = await requireStaff();

  const id = Number(form.get("id"));
  const status = String(form.get("status") ?? "");
  const reason = String(form.get("reason") ?? "").trim();

  if (!Number.isInteger(id) || !STATUSES.includes(status)) return;
  if (NEEDS_REASON.includes(status) && !reason) return;

  await db.source.update({
    where: { id },
    data: {
      status,
      reason: reason || null,
      decidedById: user.id,
      decidedAt: new Date(),
    },
  });

  revalidatePath("/admin/sources");
  revalidatePath(`/admin/sources/${id}`);
}

/**
 * Имя, вписанное руками.
 *
 * Нужно там, где из ссылки имени не видно: у поста в Instagram в адресе
 * автора нет вовсе. Проверяющий открывает ссылку, читает имя глазами и
 * вписывает его сюда. Помечается origin=manual — чтобы потом было видно,
 * что это не наблюдение машины, а чьё-то утверждение.
 */
export async function addSourceHandle(form: FormData) {
  await requireStaff();

  const id = Number(form.get("id"));
  const value = String(form.get("value") ?? "").trim().replace(/^@/, "");
  const kind = String(form.get("kind") ?? "HANDLE") === "NAME" ? "NAME" : "HANDLE";

  if (!Number.isInteger(id) || !value || value.length > 64) return;

  await db.sourceHandle.upsert({
    where: { sourceId_kind_value: { sourceId: id, kind, value } },
    create: { sourceId: id, kind, value, origin: "manual" },
    update: { lastSeenAt: new Date() },
  });

  // Имя в адресе — текущее имя источника. Подпись аккаунта им не считается.
  if (kind === "HANDLE") {
    await db.source.update({ where: { id }, data: { handle: value } });
  }

  revalidatePath(`/admin/sources/${id}`);
}

/**
 * Слить два источника в один: «это тот же аккаунт, просто переименовался».
 *
 * Без этого действия реестр не решает задачу, ради которой заведён. Там,
 * где площадка не показывает устойчивый номер — а это почти везде, —
 * переименовавшийся аккаунт приезжает к нам как новый источник, и машине
 * связать их нечем. Связывает человек, который открыл обе ссылки и увидел,
 * что это одно и то же.
 *
 * Из двух записей выживает та, куда сливаем: к ней переезжают все имена и
 * все сообщения, вторая удаляется. Оценка победившей записи не трогается —
 * решение принимал человек, и молча переписывать его нельзя.
 */
export async function mergeSources(form: FormData) {
  await requireStaff();

  const keepId = Number(form.get("keepId"));
  const mergeId = Number(form.get("mergeId"));

  if (!Number.isInteger(keepId) || !Number.isInteger(mergeId)) return;
  if (keepId === mergeId) return;

  const [keep, merge] = await Promise.all([
    db.source.findUnique({ where: { id: keepId } }),
    db.source.findUnique({ where: { id: mergeId }, include: { handles: true } }),
  ]);
  if (!keep || !merge) return;

  await db.$transaction(async (tx) => {
    // Имена переносим по одному: у победителя такое имя уже может быть,
    // и тогда сохраняем самую раннюю встречу — история должна остаться
    // непрерывной, а не начаться с даты слияния.
    for (const handle of merge.handles) {
      const existing = await tx.sourceHandle.findUnique({
        where: {
          sourceId_kind_value: { sourceId: keepId, kind: handle.kind, value: handle.value },
        },
      });

      if (existing) {
        await tx.sourceHandle.update({
          where: { id: existing.id },
          data: {
            firstSeenAt: existing.firstSeenAt < handle.firstSeenAt ? existing.firstSeenAt : handle.firstSeenAt,
            lastSeenAt: existing.lastSeenAt > handle.lastSeenAt ? existing.lastSeenAt : handle.lastSeenAt,
          },
        });
      } else {
        await tx.sourceHandle.create({
          data: {
            sourceId: keepId,
            kind: handle.kind,
            value: handle.value,
            firstSeenAt: handle.firstSeenAt,
            lastSeenAt: handle.lastSeenAt,
            origin: handle.origin,
          },
        });
      }
    }

    await tx.report.updateMany({ where: { sourceId: mergeId }, data: { sourceId: keepId } });
    await tx.source.delete({ where: { id: mergeId } });
  });

  revalidatePath("/admin/sources");
  revalidatePath(`/admin/sources/${keepId}`);
}
