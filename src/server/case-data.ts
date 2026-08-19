import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { hostFromUrl } from "@/lib/format";

// Запросы для страницы случаев. Наружу отдаём готовые к показу поля, без
// сырых колонок: компонентам незачем знать, что площадка вычисляется из
// mediaLink.

export type CaseListItem = {
  id: number;
  publicId: string;
  typeSlug: string;
  typeName: { ru: string; ky: string };
  source: string | null;
  city: string | null;
  checkedAt: Date;
};

export type CaseDetail = CaseListItem & {
  link: string | null;
  authorComment: string | null;
  moderatorComment: string | null;
};

export const PER_PAGE = 20;

const CONFIRMED = { status: REPORT_STATUS.APPROVED };

/** Условие отбора: подтверждённые, при необходимости одного вида. */
const filterBy = (typeSlug?: string) =>
  typeSlug ? { ...CONFIRMED, violationType: { slug: typeSlug } } : CONFIRMED;

const toListItem = (row: {
  id: number;
  publicId: string;
  mediaLink: string | null;
  city: string | null;
  createdAt: Date;
  violationType: { slug: string; nameRu: string; nameKy: string };
}): CaseListItem => ({
  id: row.id,
  publicId: row.publicId,
  typeSlug: row.violationType.slug,
  typeName: { ru: row.violationType.nameRu, ky: row.violationType.nameKy },
  source: hostFromUrl(row.mediaLink),
  city: row.city,
  checkedAt: row.createdAt,
});

export type CasePage = {
  items: CaseListItem[];
  total: number;
  page: number;
  pageCount: number;
};

/** Страница списка. Номер страницы приходит из адреса, поэтому не доверяем. */
export async function loadCasePage(
  typeSlug: string | undefined,
  requestedPage: number,
): Promise<CasePage> {
  const where = filterBy(typeSlug);
  const total = await db.report.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);

  const rows = await db.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    include: { violationType: true },
  });

  return { items: rows.map(toListItem), total, page, pageCount };
}

/** Один случай по публичному номеру. Null, если такого нет или он не подтверждён. */
export async function loadCase(publicId: string): Promise<CaseDetail | null> {
  const row = await db.report.findFirst({
    where: { publicId, ...CONFIRMED },
    include: { violationType: true },
  });

  if (!row) return null;

  return {
    ...toListItem(row),
    link: row.mediaLink,
    authorComment: row.authorComment,
    moderatorComment: row.moderatorComment,
  };
}

/** Номера всех подтверждённых случаев — для заготовки страниц. */
export const loadCaseIds = async (): Promise<string[]> => {
  const rows = await db.report.findMany({
    where: CONFIRMED,
    select: { publicId: true },
  });
  return rows.map((row) => row.publicId);
};
