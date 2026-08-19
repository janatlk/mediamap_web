import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";

// Виды нарушений нужны и главной, и списку случаев. Держим запрос здесь,
// чтобы не разъезжались условия отбора.

export type ViolationType = {
  slug: string;
  name: { ru: string; ky: string };
  description: { ru: string; ky: string };
  count: number;
};

/** Все виды по порядку, с числом подтверждённых случаев. */
export async function loadViolationTypes(): Promise<ViolationType[]> {
  const rows = await db.violationType.findMany({
    orderBy: { sort: "asc" },
    include: {
      _count: { select: { reports: { where: { status: REPORT_STATUS.APPROVED } } } },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: { ru: row.nameRu, ky: row.nameKy },
    description: { ru: row.descRu, ky: row.descKy },
    count: row._count.reports,
  }));
}
