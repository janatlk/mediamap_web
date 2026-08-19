import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";

// Виды нарушений нужны и главной, и списку случаев. Запрос держим здесь,
// чтобы условия отбора не разъехались по копиям.
//
// Наружу отдаём только slug и счётчик: слова берутся из словаря по этому же
// slug, база их больше не хранит.

export type ViolationType = {
  slug: string;
  count: number;
};

/** Все виды по порядку, с числом подтверждённых случаев. */
export async function loadViolationTypes(): Promise<ViolationType[]> {
  const rows = await db.violationType.findMany({
    orderBy: { sort: "asc" },
    include: {
      _count: {
        select: { reports: { where: { status: REPORT_STATUS.APPROVED } } },
      },
    },
  });

  return rows.map((row) => ({ slug: row.slug, count: row._count.reports }));
}
