import { z } from "zod";

// Проверка данных при регистрации и входе заявителя.

export const ACCOUNT_ERRORS = {
  emailInvalid: "emailInvalid",
  passwordShort: "passwordShort",
  nameLong: "nameLong",
  taken: "taken",
  wrong: "wrong",
  currentWrong: "currentWrong",
  samePassword: "samePassword",
} as const;

// Восемь символов, а не двенадцать как у сотрудников: у заявителя за
// аккаунтом нет ни чужих данных, ни права что-то менять на сайте, и
// заградительное требование здесь только отпугнёт.
const PASSWORD_MIN = 8;
const NAME_MAX = 80;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(ACCOUNT_ERRORS.emailInvalid),
  password: z.string().min(PASSWORD_MIN, ACCOUNT_ERRORS.passwordShort),
  name: z.string().trim().max(NAME_MAX, ACCOUNT_ERRORS.nameLong).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(ACCOUNT_ERRORS.emailInvalid),
  password: z.string().min(1, ACCOUNT_ERRORS.wrong),
});

/*
  Смена пароля в профиле.

  Текущий пароль спрашиваем всегда: без него любой, кто подсел за чужой
  открытый ноутбук, уводит аккаунт одним нажатием. Длину нового проверяет
  уже действие: у сотрудника порог выше, чем у заявителя, а схема про роли
  не знает.
*/
export const passwordChangeSchema = z.object({
  current: z.string().min(1, ACCOUNT_ERRORS.currentWrong),
  password: z.string().min(PASSWORD_MIN, ACCOUNT_ERRORS.passwordShort),
});

/** Порог для сотрудников — тот же, что у скрипта create-admin. */
const STAFF_PASSWORD_MIN = 12;

export const ACCOUNT_LIMITS = { PASSWORD_MIN, STAFF_PASSWORD_MIN, NAME_MAX };
