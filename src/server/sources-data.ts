import { db } from "@/lib/db";
import { REPORT_STATUS, SOURCE_STATUS } from "@/lib/enums";
import { readSource, sourceKey, type SourceRef } from "@/lib/platforms";

/*
  Реестр источников: чтение и запись наблюдений.

  Записи заводятся сами, при подаче сообщения со ссылкой, и всегда в
  состоянии UNKNOWN. Это принципиально: реестр — журнал встреч, а не список
  обвинённых. Оценку ставит человек, отдельным действием, с обоснованием.

  Наблюдение и оценка нигде не смешиваются. Машина пишет только «такого-то
  числа этот аккаунт назывался так» — факт, который она действительно
  наблюдала. Всё оценочное лежит в полях status и reason, и их машина не
  трогает никогда.
*/

export type HandleRow = {
  value: string;
  kind: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  origin: string;
};

export type SourceRow = {
  id: number;
  key: string;
  platform: string;
  handle: string | null;
  host: string;
  displayName: string | null;
  status: string;
  reason: string | null;
  decidedAt: Date | null;
  decidedBy: string | null;
  createdAt: Date;
  /** Сколько сообщений про этот источник и сколько из них подтвердилось. */
  reportCount: number;
  confirmedCount: number;
  /** Сколько разных имён за ним записано. */
  handleCount: number;
};

/**
 * Заводит источник по ссылке или находит уже заведённый и отмечает встречу.
 *
 * Возвращает id источника или null, если из ссылки ничего не вычиталось.
 * Молчаливый null здесь правильный: сообщение важнее реестра, и падать на
 * кривой ссылке из-за побочной записи в журнал нельзя.
 */
export async function noteSourceFromLink(link: string | null): Promise<number | null> {
  const ref = readSource(link);
  if (!ref) return null;

  try {
    return await recordSighting(ref);
  } catch {
    // Реестр — дело десятое. Сообщение уже принято, и терять его из-за
    // неудачной записи в журнал источников нельзя.
    return null;
  }
}

/** Заводит или обновляет источник и его имена. */
async function recordSighting(ref: SourceRef): Promise<number> {
  const key = sourceKey(ref);
  const now = new Date();

  const source = await db.source.upsert({
    where: { key },
    create: {
      key,
      platform: ref.platform,
      externalId: ref.externalId,
      handle: ref.handle,
      host: ref.host,
      status: SOURCE_STATUS.UNKNOWN,
    },
    // Имя обновляем: у источника с устойчивым номером это и есть
    // переименование, и текущим должно значиться последнее увиденное.
    update: ref.handle ? { handle: ref.handle } : {},
  });

  if (ref.handle) {
    await db.sourceHandle.upsert({
      where: {
        sourceId_kind_value: { sourceId: source.id, kind: "HANDLE", value: ref.handle },
      },
      create: { sourceId: source.id, kind: "HANDLE", value: ref.handle, origin: "link" },
      // Имя уже видели — двигаем только «последний раз». Первую встречу
      // не трогаем: она и есть ответ на вопрос «с каких пор он так зовётся».
      update: { lastSeenAt: now },
    });
  }

  return source.id;
}

const CONFIRMED = { status: REPORT_STATUS.APPROVED };

export type Filter = {
  status: string;
  query: string;
};

const toRow = (row: {
  id: number;
  key: string;
  platform: string;
  handle: string | null;
  host: string;
  displayName: string | null;
  status: string;
  reason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  decidedBy: { name: string | null; email: string } | null;
  _count: { handles: number; reports: number };
}): Omit<SourceRow, "confirmedCount"> => ({
  id: row.id,
  key: row.key,
  platform: row.platform,
  handle: row.handle,
  host: row.host,
  displayName: row.displayName,
  status: row.status,
  reason: row.reason,
  decidedAt: row.decidedAt,
  decidedBy: row.decidedBy ? (row.decidedBy.name ?? row.decidedBy.email) : null,
  createdAt: row.createdAt,
  reportCount: row._count.reports,
  handleCount: row._count.handles,
});

/** Реестр для панели. */
export async function loadSources(filter: Filter): Promise<SourceRow[]> {
  const query = filter.query.trim();

  const rows = await db.source.findMany({
    where: {
      ...(filter.status === "ALL" ? {} : { status: filter.status }),
      ...(query
        ? {
            OR: [
              { handle: { contains: query } },
              { host: { contains: query } },
              { displayName: { contains: query } },
              // Ищем и по прежним именам: человек помнит, как аккаунт
              // назывался, а не как он зовётся сегодня. Ради этого
              // история и ведётся.
              { handles: { some: { value: { contains: query } } } },
            ],
          }
        : {}),
    },
    include: {
      decidedBy: { select: { name: true, email: true } },
      _count: { select: { handles: true, reports: true } },
    },
    // Сначала то, о чём чаще сообщают: реестр читают сверху.
    orderBy: [{ reports: { _count: "desc" } }, { createdAt: "desc" }],
    take: 200,
  });

  // Подтверждённые считаем отдельно: _count по связи не умеет условия.
  const confirmed = await db.report.groupBy({
    by: ["sourceId"],
    where: { ...CONFIRMED, sourceId: { in: rows.map((row) => row.id) } },
    _count: { _all: true },
  });
  const byId = new Map(confirmed.map((item) => [item.sourceId, item._count._all]));

  return rows.map((row) => ({
    ...toRow(row),
    confirmedCount: byId.get(row.id) ?? 0,
  }));
}

export type SourceDetail = SourceRow & {
  handles: HandleRow[];
  reports: { id: number; publicId: string; headline: string | null; status: string; createdAt: Date }[];
};

export async function loadSource(id: number): Promise<SourceDetail | null> {
  const row = await db.source.findUnique({
    where: { id },
    include: {
      decidedBy: { select: { name: true, email: true } },
      _count: { select: { handles: true, reports: true } },
      handles: { orderBy: { firstSeenAt: "asc" } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, publicId: true, headline: true, status: true, createdAt: true },
      },
    },
  });

  if (!row) return null;

  const confirmedCount = await db.report.count({
    where: { ...CONFIRMED, sourceId: id },
  });

  return {
    ...toRow(row),
    confirmedCount,
    handles: row.handles.map((handle) => ({
      value: handle.value,
      kind: handle.kind,
      firstSeenAt: handle.firstSeenAt,
      lastSeenAt: handle.lastSeenAt,
      origin: handle.origin,
    })),
    reports: row.reports,
  };
}

/** Сколько источников в каждом состоянии — для вкладок панели. */
export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await db.source.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<string, number> = { ALL: 0 };
  for (const row of rows) {
    counts[row.status] = row._count._all;
    counts.ALL += row._count._all;
  }
  return counts;
}

/**
 * Источники, у которых имя менялось. Ради этого реестр и заводился.
 *
 * Считаем по числу записанных имён: два и больше — значит переименование
 * было. Работает только там, где мы узнаём аккаунт после смены имени, то
 * есть у источников с устойчивым номером и у слитых руками.
 */
export async function loadRenamed(): Promise<SourceRow[]> {
  const all = await loadSources({ status: "ALL", query: "" });
  return all.filter((row) => row.handleCount > 1);
}
