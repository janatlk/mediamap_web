import { db } from "@/lib/db";
import { REPORT_STATUS, type ReportStatus } from "@/lib/enums";
import { hostFromUrl } from "@/lib/format";
import { parseChecks } from "./case-data";
import type { TypeCheck } from "./ml-service";

/*
  Список сообщений для панели.

  Раньше здесь была только очередь — непроверенное. Но проверяющему нужно
  видеть и то, что он уже решил: вернуться к вчерашнему делу, посмотреть, что
  отклонил коллега, найти сообщение по номеру. Поэтому фильтр, а не жёсткая
  выборка PENDING.
*/

/** Сколько показываем на странице. Больше сотни карточек никто не пролистает. */
export const PAGE_SIZE = 25;

export type ReportRow = {
  id: number;
  publicId: string;
  /** Личный ключ страницы «принято» — по нему открывается вид заявителя. */
  receiptToken: string | null;
  status: ReportStatus;
  headline: string | null;
  typeSlug: string;
  story: string | null;
  link: string | null;
  source: string | null;
  city: string | null;
  createdAt: Date;
  /** Когда произошло само нарушение. Пусто у сообщений до появления поля. */
  happenedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  moderatorComment: string | null;

  aiVerdict: string | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  aiSource: string | null;
  /** Правки проверяющего поверх оценки модели. Пусто — значит не менял. */
  reviewVerdict: string | null;
  reviewConfidence: number | null;
  reviewSummary: string | null;
  /** Текст, который модель списала с приложенной картинки. */
  aiExtractedText: string | null;
  /**
   * Ответ модели по каждому виду в отдельности.
   *
   * Проверяющему это нужнее общего вердикта. Заявитель выбирает вид сам, и
   * на «цифровое мошенничество» надо отвечать про мошенничество — а общее
   * пояснение приходит от той головы, которая ответила первой. В панели это
   * читалось так: человек заявил об обмане, а под разбором стояло «текст не
   * направлен против какой-либо группы людей».
   */
  checks: Partial<Record<string, TypeCheck>>;
  claim: string | null;
  factVerdict: string | null;
  sources: string[];
  /**
   * Почему разбор не удался целиком или частично.
   *
   * Чаще всего это ссылка: площадка потребовала входа, запись закрыта,
   * ролик удалён. На тестировании проверяющие видели «не смог по ссылке
   * открыть» и шли спрашивать, сломался ли сервис, — причина всё это время
   * лежала в журнале и никому не показывалась.
   */
  aiError: string | null;

  attachments: { id: string; kind: string; name: string; mime: string; public: boolean }[];
};

export type Filter = {
  status: ReportStatus | "ALL";
  query: string;
  page: number;
};

export type Page = {
  rows: ReportRow[];
  total: number;
  page: number;
  pages: number;
  counts: Record<string, number>;
};

export async function loadReports(filter: Filter): Promise<Page> {
  const where = buildWhere(filter);
  const page = Math.max(1, filter.page);

  const [rows, total, counts] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: order(filter.status),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        violationType: { select: { slug: true } },
        reviewedBy: { select: { name: true, email: true } },
        attachments: {
          select: { id: true, kind: true, name: true, mime: true, public: true },
          orderBy: { createdAt: "asc" },
        },
        aiChecks: {
          where: { ok: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { claim: true, factVerdict: true, sources: true, error: true },
        },
      },
    }),
    db.report.count({ where }),
    countByStatus(),
  ]);

  return {
    rows: rows.map(toRow),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts,
  };
}

function buildWhere(filter: Filter) {
  const status = filter.status === "ALL" ? undefined : filter.status;
  const query = filter.query.trim();
  if (!query) return { status };

  // Ищем по номеру и по тексту — этого хватает, чтобы найти нужное дело.
  return {
    status,
    OR: [
      { publicId: { contains: query } },
      { authorComment: { contains: query } },
      { city: { contains: query } },
    ],
  };
}

/**
 * Непроверенное — по убыванию уверенности разбора: сверху самое похожее на
 * настоящее нарушение. Всё остальное — по дате решения, как в журнале.
 */
function order(status: Filter["status"]) {
  if (status === REPORT_STATUS.PENDING) {
    return [{ aiConfidence: "desc" as const }, { createdAt: "asc" as const }];
  }
  return [{ createdAt: "desc" as const }];
}

async function countByStatus(): Promise<Record<string, number>> {
  const grouped = await db.report.groupBy({ by: ["status"], _count: true });
  const counts: Record<string, number> = { ALL: 0 };

  for (const row of grouped) {
    counts[row.status] = row._count;
    counts.ALL += row._count;
  }
  return counts;
}

function toRow(row: {
  id: number;
  publicId: string;
  receiptToken: string | null;
  status: string;
  headline: string | null;
  authorComment: string | null;
  mediaLink: string | null;
  city: string | null;
  createdAt: Date;
  happenedAt: Date | null;
  reviewedAt: Date | null;
  moderatorComment: string | null;
  aiVerdict: string | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  aiSource: string | null;
  reviewVerdict: string | null;
  reviewConfidence: number | null;
  reviewSummary: string | null;
  aiExtractedText: string | null;
  aiTypeChecks: string | null;
  violationType: { slug: string };
  reviewedBy: { name: string | null; email: string } | null;
  attachments: { id: string; kind: string; name: string; mime: string; public: boolean }[];
  aiChecks: {
    claim: string | null;
    factVerdict: string | null;
    sources: string | null;
    error: string | null;
  }[];
}): ReportRow {
  const check = row.aiChecks[0];

  return {
    id: row.id,
    publicId: row.publicId,
    receiptToken: row.receiptToken,
    status: row.status as ReportStatus,
    headline: row.headline,
    typeSlug: row.violationType.slug,
    story: row.authorComment,
    link: row.mediaLink,
    source: hostFromUrl(row.mediaLink),
    city: row.city,
    createdAt: row.createdAt,
    happenedAt: row.happenedAt,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy?.name ?? row.reviewedBy?.email ?? null,
    moderatorComment: row.moderatorComment,

    aiVerdict: row.aiVerdict,
    aiConfidence: row.aiConfidence,
    aiSummary: row.aiSummary,
    aiSource: row.aiSource,
    reviewVerdict: row.reviewVerdict,
    reviewConfidence: row.reviewConfidence,
    reviewSummary: row.reviewSummary,
    aiExtractedText: row.aiExtractedText,
    checks: parseChecks(row.aiTypeChecks),
    claim: check?.claim ?? null,
    factVerdict: check?.factVerdict ?? null,
    // В базе ссылки одной строкой через перенос — массивов в SQLite нет.
    sources: check?.sources ? check.sources.split("\n").filter(Boolean) : [],
    aiError: check?.error ?? null,

    attachments: row.attachments,
  };
}

/** Сколько сообщений ждёт проверки. Нужно для значка в меню. */
export const countPending = () =>
  db.report.count({ where: { status: REPORT_STATUS.PENDING } });
