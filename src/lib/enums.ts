/**
 * Наборы допустимых значений для строковых колонок.
 *
 * В схеме они строки — SQLite не умеет перечисления, а разработка идёт
 * на нём. Единственный источник правды о допустимых значениях здесь,
 * и всё, что приходит извне, проверяется по этим спискам.
 */

export const ROLES = ["MODERATOR", "ADMIN", "SUPERADMIN"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Роли, которые администратор вправе выдать при создании сотрудника.
 * SUPERADMIN сюда не входит намеренно: такой доступ выдаётся только
 * напрямую в базе.
 */
export const ASSIGNABLE_ROLES = ["MODERATOR", "ADMIN"] as const;

export const REPORT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Кому разрешено менять содержимое сайта. */
export const canEditContent = (role: string | null | undefined): boolean =>
  role === "ADMIN" || role === "SUPERADMIN";

/** Кому разрешено рассматривать заявки. */
export const canReviewReports = (role: string | null | undefined): boolean =>
  ROLES.includes(role as Role);
