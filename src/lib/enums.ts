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

/**
 * Доверие к источнику.
 *
 * Четыре значения, и UNKNOWN среди них не «пока не разобрались», а
 * нормальное состояние: аккаунт встретился один раз, и сказать о нём
 * нечего. Большая часть реестра так и останется в UNKNOWN — это правильно.
 * Чёрный список, куда попадает всякий встреченный, не список, а свалка.
 *
 * WATCH стоит между: замечен за плохим, но на приговор не набрано.
 * Без него всякое сомнение округлялось бы до UNTRUSTED.
 */
export const SOURCE_STATUS = {
  /** Просто встретился. Ничего не утверждаем. */
  UNKNOWN: "UNKNOWN",
  /** Проверяли, материалы подтверждаются. Белый список. */
  TRUSTED: "TRUSTED",
  /** Есть вопросы, решения пока нет. */
  WATCH: "WATCH",
  /** Подтверждённые нарушения. Чёрный список. */
  UNTRUSTED: "UNTRUSTED",
} as const;

export type SourceStatus = (typeof SOURCE_STATUS)[keyof typeof SOURCE_STATUS];

/** Оценка, которую нельзя ставить без письменного обоснования. */
export const NEEDS_REASON: string[] = [SOURCE_STATUS.UNTRUSTED, SOURCE_STATUS.WATCH];

export const ATTACHMENT_KIND = {
  /** Снимок экрана или фотография. */
  IMAGE: "IMAGE",
  /** Запись экрана или видео. */
  VIDEO: "VIDEO",
} as const;

export type AttachmentKind =
  (typeof ATTACHMENT_KIND)[keyof typeof ATTACHMENT_KIND];
