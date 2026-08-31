import { z } from "zod";

import { KG_REGIONS } from "./regions";

// Проверка сообщения о нарушении.
//
// Схема одна на две стороны: браузер по ней подсказывает, сервер по ней
// решает. Верить браузеру нельзя — форму можно отправить и мимо него, —
// поэтому на сервере проверка повторяется целиком, а не выборочно.

/** Ключи ошибок. Текст к ним лежит в словаре, чтобы не плодить переводы в коде. */
export const ERRORS = {
  typeRequired: "typeRequired",
  storyShort: "storyShort",
  storyLong: "storyLong",
  linkInvalid: "linkInvalid",
  consentRequired: "consentRequired",
  cityLong: "cityLong",
  regionUnknown: "regionUnknown",
  dateInvalid: "dateInvalid",
  dateFuture: "dateFuture",
  dateAncient: "dateAncient",
} as const;

const STORY_MIN = 30;
const STORY_MAX = 4000;
const CITY_MAX = 80;

/*
  Нижняя граница даты. Раньше неё случаев у нас не бывает: соцсетей в
  сегодняшнем виде не было, а число из такой глубины — почти наверняка
  описка в годе. Верхней границей стоит сегодня: нарушение не может
  произойти завтра.
*/
const EARLIEST = "2000-01-01";

/** Сегодня по календарю, строкой YYYY-MM-DD — в том же виде, что даёт поле. */
export function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export const reportSchema = z.object({
  /** Вид нарушения. Совпадение со списком проверяется отдельно, по базе. */
  typeSlug: z.string().min(1, ERRORS.typeRequired),

  /**
   * Ссылка на публикацию. Не обязательна: скриншот человек приложить пока
   * не может, а публикацию мог увидеть в закрытом чате, откуда ссылки нет.
   */
  link: z
    .union([z.literal(""), z.string().trim().url(ERRORS.linkInvalid)])
    .optional(),

  /**
   * Что произошло. Нижняя граница не придирка: по строке «оскорбили»
   * проверить нечего, и сообщение всё равно вернётся с вопросами.
   */
  story: z
    .string()
    .trim()
    .min(STORY_MIN, ERRORS.storyShort)
    .max(STORY_MAX, ERRORS.storyLong),

  city: z.string().trim().max(CITY_MAX, ERRORS.cityLong).optional(),

  /*
    Когда это произошло.

    Появилось по простому поводу: сообщить о случае двухлетней давности было
    нечем. Даты в форме не было вовсе, и единственным временем у случая
    оставалось время подачи — для вчерашнего поста это одно и то же, для
    старого неправда.

    Пустое поле — не ошибка: значит сегодня. Человек, который не стал
    трогать дату, имел в виду именно это, и возвращать ему форму с
    требованием заполнить то, что и так подставлено, незачем.
  */
  happenedAt: z
    .union([
      z.literal(""),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, ERRORS.dateInvalid)
        .refine((value) => !Number.isNaN(Date.parse(value)), ERRORS.dateInvalid)
        .refine((value) => value <= today(), ERRORS.dateFuture)
        .refine((value) => value >= EARLIEST, ERRORS.dateAncient),
    ])
    .optional(),

  /*
    Область — необязательна, но полезнее города: по ней строится карта.
    Спрашиваем выбором из семи, а не текстом: «Чуй», «Чуйская» и «чуйская
    обл.» пришлось бы разбирать вручную, а карта всё равно ждёт код.
  */
  regionCode: z
    .union([
      z.literal(""),
      z.enum(
        KG_REGIONS.map((region) => region.code) as [string, ...string[]],
        ERRORS.regionUnknown,
      ),
    ])
    .optional(),

  /** Согласие на публикацию случая. Мы публикуем — значит должны спросить. */
  consent: z.literal("on", ERRORS.consentRequired),

  /**
   * Ловушка для роботов. Поле спрятано от людей, но живёт в разметке:
   * автозаполнялки его заполняют, человек — нет. Пришло непустым — молча
   * не принимаем.
   */
  trap: z.string().max(0).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const LIMITS = { STORY_MIN, STORY_MAX, CITY_MAX, EARLIEST };
