import { z } from "zod";

// Проверка данных при регистрации и входе заявителя.

export const ACCOUNT_ERRORS = {
  emailInvalid: "emailInvalid",
  passwordShort: "passwordShort",
  nameLong: "nameLong",
  taken: "taken",
  wrong: "wrong",
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

export const ACCOUNT_LIMITS = { PASSWORD_MIN, NAME_MAX };
