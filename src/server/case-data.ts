import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { hostFromUrl } from "@/lib/format";
import type { ViolationSlug } from "@/lib/i18n";
import type { TypeCheck } from "./ml-service";

// Запросы для страницы случаев. Наружу отдаём готовые к показу поля, без
// сырых колонок: компонентам незачем знать, что площадка вычисляется из
// mediaLink.

export type CaseListItem = {
  id: number;
  publicId: string;
  /** Короткий заголовок случая. Пусто у старых записей — тогда показываем вид. */
  headline: string | null;
  typeSlug: string;
  source: string | null;
  city: string | null;
  checkedAt: Date;
};

export type CaseDetail = CaseListItem & {
  /*
    Приложенное — только то, что проверяющий открыл поимённо.

    Не всё подряд: заявитель присылал снимок нам на проверку, а на снимке
    переписки бывает его собственное имя и номер. Пустой список — обычное
    состояние, а не поломка.
  */
  attachments: { id: string; kind: string; name: string; mime: string }[];
  /*
    Когда произошло само нарушение. Пусто у сообщений, поданных до того, как
    в форме появилась дата: подставлять им дату подачи нельзя — она про
    другое, и у старого случая была бы неправдой.
  */
  happenedAt: Date | null;
  /** Рекомендация по терминологии. Пусто — поводов не нашлось. */
  terminology: string | null;
  link: string | null;
  authorComment: string | null;
  moderatorComment: string | null;
  /*
    Разбор модели — теперь и на публичной странице, по решению проекта.

    Раньше его видел только заявитель на своей странице «принято». Логика
    была в том, что это ответ ему; но случай опубликован, и человек со
    стороны вправе знать, на чём стоит вывод, — иначе публикация выглядит
    решением из ниоткуда.

    Пусто у старых записей и у тех, где разбора не было.
  */
  ai: CaseAssessment | null;
  /** По чему судила модель: снимок, ссылка или пересказ заявителя. */
  basis: "image" | "link" | "story";
};

export type CaseAssessment = {
  verdict: string;
  confidence: number;
  reasons: string[];
  explanation: string | null;
  source: "rules" | "model";
  checks: Partial<Record<ViolationSlug, TypeCheck>>;
};

export const PER_PAGE = 20;

const CONFIRMED = { status: REPORT_STATUS.APPROVED };

/** Условие отбора: подтверждённые, при необходимости одного вида. */
const filterBy = (typeSlug?: string) =>
  typeSlug ? { ...CONFIRMED, violationType: { slug: typeSlug } } : CONFIRMED;

const toListItem = (row: {
  id: number;
  publicId: string;
  headline: string | null;
  mediaLink: string | null;
  city: string | null;
  createdAt: Date;
  violationType: { slug: string };
}): CaseListItem => ({
  id: row.id,
  publicId: row.publicId,
  headline: row.headline,
  typeSlug: row.violationType.slug,
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
    include: {
      violationType: true,
      attachments: {
        where: { public: true },
        select: { id: true, kind: true, name: true, mime: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!row) return null;

  return {
    ...toListItem(row),
    attachments: row.attachments,
    happenedAt: row.happenedAt,
    terminology: row.aiTerminology,
    link: row.mediaLink,
    authorComment: row.authorComment,
    moderatorComment: row.moderatorComment,
    basis:
      row.aiBasis === "image" || row.aiBasis === "link" ? row.aiBasis : "story",
    ai: assessmentOf(row),
  };
}

/*
  Оценка, приведённая к виду для показа.

  Правка проверяющего идёт вместо оценки модели, а не рядом: читателю нужен
  ответ, а не протокол разногласий внутри редакции. След модели никуда не
  девается — он в колонках ai* и в журнале проверок.

  Тот же расчёт делает loadReceipt для страницы «принято». Держать его в
  одном месте нельзя без ещё одного слоя, а два вызова с разными типами
  строк дороже, чем это повторение; если появится третий — вынести.
*/
function assessmentOf(row: {
  aiVerdict: string | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  aiSource: string | null;
  aiTypeChecks: string | null;
  reviewVerdict: string | null;
  reviewConfidence: number | null;
  reviewSummary: string | null;
}): CaseAssessment | null {
  const verdict = row.reviewVerdict ?? row.aiVerdict;
  const confidence = row.reviewConfidence ?? row.aiConfidence;
  if (!verdict || confidence === null) return null;

  return {
    verdict,
    confidence,
    // У разбора по словам в aiSummary лежат коды через запятую, у модели —
    // связный текст. Резать его по запятым нельзя: выходили обрывки
    // предложений, поданные как список причин.
    reasons:
      row.reviewSummary || row.aiSource === "model"
        ? []
        : (row.aiSummary ?? "").split(",").filter(Boolean),
    explanation:
      row.reviewSummary ?? (row.aiSource === "model" ? row.aiSummary : null),
    source: row.aiSource === "model" ? "model" : "rules",
    checks: parseChecks(row.aiTypeChecks),
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

export type Receipt = {
  publicId: string;
  status: string;
  typeSlug: string;
  createdAt: Date;
  /** Рекомендация по терминологии. Пусто — поводов не нашлось. */
  terminology: string | null;
  /** То, что человек написал. Через день он этого уже не помнит. */
  story: string | null;
  link: string | null;
  city: string | null;
  attachments: { id: string; kind: string; name: string; mime: string }[];
  /** Заметка проверяющего к решению. Человек вправе знать, почему решили так. */
  moderatorComment: string | null;
  /** Решение принял живой человек, а не только модель. */
  reviewed: boolean;
  /** Пояснение, переписанное проверяющим. Пусто — остаётся вариант модели. */
  reviewSummary: string | null;
  /** Проверяющий поменял вердикт, уверенность или пояснение. */
  overridden: boolean;
  /*
    По чему судила модель: снимок, ссылка или пересказ заявителя.

    Разница принципиальная, и человеку о ней надо сказать. Разбор по описанию
    относится к словам заявителя, а не к тому, что он видел, — а он-то
    спрашивает про увиденное.
  */
  basis: "image" | "link" | "story";
  ai: {
    verdict: string;
    confidence: number;
    /** Перечень примет — только у разбора по словам. */
    reasons: string[];
    /** Обоснование словами — только у модели. */
    explanation: string | null;
    source: "rules" | "model";
    /*
      Что модель ответила по каждому виду. Пусто у разбора по словам и у
      старых записей, снятых до появления этого поля, — страница должна
      уметь обойтись без него, а не показывать пустой вывод.
    */
    checks: Partial<Record<ViolationSlug, TypeCheck>>;
  } | null;
};

/**
 * Сообщение по личному ключу — для страницы «принято».
 *
 * Ищем именно по ключу, а не по номеру: номер угадывается, а сообщение до
 * проверки не опубликовано. Статус отдаём любой, в том числе отклонённый:
 * человек вправе узнать решение по своему сообщению.
 */
export async function loadReceipt(token: string): Promise<Receipt | null> {
  const row = await db.report.findUnique({
    where: { receiptToken: token },
    include: {
      violationType: { select: { slug: true } },
      attachments: {
        select: { id: true, kind: true, name: true, mime: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!row) return null;

  return {
    publicId: row.publicId,
    status: row.status,
    typeSlug: row.violationType.slug,
    createdAt: row.createdAt,
    terminology: row.aiTerminology,
    story: row.authorComment,
    link: row.mediaLink,
    city: row.city,
    attachments: row.attachments,
    moderatorComment: row.moderatorComment,
    reviewed: row.reviewedAt !== null,
    reviewSummary: row.reviewSummary,
    overridden:
      row.reviewVerdict !== null ||
      row.reviewConfidence !== null ||
      row.reviewSummary !== null,
    // Старые записи признака не знают — для них честнее «по описанию»:
    // ни ссылок, ни снимков модель тогда не открывала.
    basis:
      row.aiBasis === "image" || row.aiBasis === "link" ? row.aiBasis : "story",
    ai:
      /*
        Правка проверяющего показывается вместо оценки модели.

        Именно вместо, а не рядом: заявителю нужен ответ, а не протокол
        разногласий внутри редакции. След модели при этом никуда не девается —
        он остался в колонках ai* и в журнале проверок.
      */
      (row.reviewVerdict ?? row.aiVerdict) &&
      (row.reviewConfidence ?? row.aiConfidence) !== null
        ? {
            verdict: (row.reviewVerdict ?? row.aiVerdict)!,
            confidence: (row.reviewConfidence ?? row.aiConfidence)!,
            // У словаря в aiSummary лежит перечень кодов через запятую, у
            // модели — связный текст. Резать его по запятым нельзя: получались
            // обрывки предложений, поданные как список причин.
            reasons:
              row.reviewSummary || row.aiSource === "model"
                ? []
                : (row.aiSummary ?? "").split(",").filter(Boolean),
            explanation:
              row.reviewSummary ?? (row.aiSource === "model" ? row.aiSummary : null),
            source: row.aiSource === "model" ? "model" : "rules",
            checks: parseChecks(row.aiTypeChecks),
          }
        : null,
  };
}

/**
 * Разбор ответов по видам из JSON-колонки.
 *
 * Молча отдаёт пустое на всём, что не разобралось. Колонку писала предыдущая
 * версия сервиса, и её формат может отличаться; лишиться из-за этого всей
 * страницы «принято» — цена несоразмерная тому, что мы теряем.
 */
export function parseChecks(raw: string | null): Partial<Record<ViolationSlug, TypeCheck>> {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Partial<Record<ViolationSlug, TypeCheck>>)
      : {};
  } catch {
    return {};
  }
}
