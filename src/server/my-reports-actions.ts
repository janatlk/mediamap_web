"use server";

import { db } from "@/lib/db";

// Состояние своих сообщений по ключам из браузера.

export type MyReport = {
  token: string;
  publicId: string;
  status: string;
  typeSlug: string;
  createdAt: string;
  reviewedAt: string | null;
  moderatorNote: string | null;
  /** Начало текста — чтобы человек узнал своё сообщение в списке. */
  excerpt: string | null;
};

/** Длиннее двух строк в списке не нужно: за подробностями открывают карточку. */
const EXCERPT = 140;

const excerptOf = (text: string | null): string | null => {
  const clean = (text ?? "").trim();
  if (!clean) return null;
  return clean.length > EXCERPT ? clean.slice(0, EXCERPT).trimEnd() + "…" : clean;
};

const MAX_TOKENS = 50;

/**
 * Отдаёт состояние сообщений по их личным ключам.
 *
 * Ключ и есть доступ: знает его только тот, кто подавал. Поэтому список
 * приходит от браузера, а сервер лишь сверяет его с базой. Ограничение на
 * длину — чтобы запросом с тысячей ключей нельзя было перебирать.
 */
export async function loadMyReports(tokens: string[]): Promise<MyReport[]> {
  const clean = tokens
    .filter((token) => typeof token === "string" && token.length > 0)
    .slice(0, MAX_TOKENS);

  if (clean.length === 0) return [];

  const rows = await db.report.findMany({
    where: { receiptToken: { in: clean } },
    orderBy: { createdAt: "desc" },
    include: { violationType: { select: { slug: true } } },
  });

  return rows.map((row) => ({
    token: row.receiptToken as string,
    publicId: row.publicId,
    status: row.status,
    typeSlug: row.violationType.slug,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    // Заметку проверяющего показываем: человек вправе знать, почему решили так.
    moderatorNote: row.moderatorComment,
    excerpt: excerptOf(row.authorComment),
  }));
}

/**
 * Все сообщения вошедшего человека.
 *
 * Здесь список приходит из базы, а не из браузера: у аккаунта сообщения
 * привязаны напрямую, и видны они на любом устройстве, где человек вошёл.
 */
export async function loadAccountReports(): Promise<MyReport[]> {
  const { currentUser } = await import("@/lib/auth");
  const user = await currentUser();
  if (!user) return [];

  const rows = await db.report.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { violationType: { select: { slug: true } } },
  });

  return rows.map((row) => ({
    token: row.receiptToken ?? String(row.id),
    publicId: row.publicId,
    status: row.status,
    typeSlug: row.violationType.slug,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    moderatorNote: row.moderatorComment,
    excerpt: excerptOf(row.authorComment),
  }));
}
