// Роль, статус и тяжесть лежат в базе строками — SQLite не умеет enum,
// а дев идёт на нём. Что считать допустимым, решается только здесь.

export const ROLE = {
  /// Обычный человек с аккаунтом. В панель не пускается.
  REPORTER: "REPORTER",
  MODERATOR: "MODERATOR",
  ADMIN: "ADMIN",
  SUPERADMIN: "SUPERADMIN",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Что админ может выдать сотруднику. SUPERADMIN — только руками в базе. */
export const ASSIGNABLE_ROLES: Role[] = [ROLE.MODERATOR, ROLE.ADMIN];

export const REPORT_STATUS = {
  /** Сообщение получено, но ещё не рассмотрено. */
  PENDING: "PENDING",
  /** Нарушение подтвердилось — случай публикуется. */
  APPROVED: "APPROVED",
  /** Проверка не подтвердила нарушение. */
  REJECTED: "REJECTED",
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const SEVERITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

/**
 * Сотрудники — те, кому открыта панель.
 *
 * Список белый, а не чёрный: появится завтра новая роль — она по умолчанию
 * никуда не попадёт, и это правильная сторона ошибки.
 */
export const STAFF_ROLES: string[] = [ROLE.MODERATOR, ROLE.ADMIN, ROLE.SUPERADMIN];

export const isStaff = (role: string | null | undefined): boolean =>
  typeof role === "string" && STAFF_ROLES.includes(role);

/** Кому разрешено менять содержимое сайта. */
export const canEditContent = (role: string | null | undefined): boolean =>
  role === ROLE.ADMIN || role === ROLE.SUPERADMIN;

export const ATTACHMENT_KIND = {
  /** Снимок экрана или фотография. */
  IMAGE: "IMAGE",
  /** Запись экрана или видео. */
  VIDEO: "VIDEO",
} as const;

export type AttachmentKind =
  (typeof ATTACHMENT_KIND)[keyof typeof ATTACHMENT_KIND];
