import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { hostFromUrl } from "@/lib/format";

// Очередь на проверку.

export type QueueItem = {
  id: number;
  publicId: string;
  typeSlug: string;
  story: string | null;
  link: string | null;
  source: string | null;
  city: string | null;
  createdAt: Date;
  aiVerdict: string | null;
  aiConfidence: number | null;
  attachments: { id: string; kind: string; name: string; mime: string }[];
};

/**
 * Нерассмотренные сообщения.
 *
 * Порядок — по убыванию уверенности разбора, а не по дате. Ради этого
 * оценка и снимается: сверху оказывается самое похожее на настоящее
 * нарушение, внизу — бессмыслица и спам. Дата разрешает ничьи, чтобы
 * старое не залёживалось.
 */
export async function loadQueue(): Promise<QueueItem[]> {
  const rows = await db.report.findMany({
    where: { status: REPORT_STATUS.PENDING },
    orderBy: [{ aiConfidence: "desc" }, { createdAt: "asc" }],
    include: {
      violationType: { select: { slug: true } },
      attachments: {
        select: { id: true, kind: true, name: true, mime: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    typeSlug: row.violationType.slug,
    story: row.authorComment,
    link: row.mediaLink,
    source: hostFromUrl(row.mediaLink),
    city: row.city,
    createdAt: row.createdAt,
    aiVerdict: row.aiVerdict,
    aiConfidence: row.aiConfidence,
    attachments: row.attachments,
  }));
}

/** Сколько сообщений ждёт проверки. */
export const countPending = () =>
  db.report.count({ where: { status: REPORT_STATUS.PENDING } });
