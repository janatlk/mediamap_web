"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import { READY_LANGUAGES } from "@/lib/i18n";
import { NEWS_LANGS } from "@/lib/news-langs";
import { collectNews } from "./news-collect";

/*
  Управление сборщиком дайджеста из панели.

  Каждое действие само проверяет доступ через requireEditor. Проверять один
  раз на странице недостаточно: серверное действие вызывается по своему
  адресу, и до него можно дотянуться, минуя страницу.

  Права те же, что у правки текстов сайта: список источников — редакторская
  работа, а не работа с сообщениями заявителей.
*/

const langs = z.enum(NEWS_LANGS);

const sourceForm = z.object({
  name: z.string().trim().min(1, "Без названия источник не отличить").max(80),
  feedUrl: z
    .string()
    .trim()
    .url("Это не похоже на адрес ленты")
    // http:// пропускаем: часть небольших изданий до сих пор без сертификата.
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "Адрес должен начинаться с http:// или https://",
    ),
  lang: langs,
  takeAll: z.coerce.boolean().default(false),
});

export type ActionState = { error?: string; done?: string };

/*
  Перерисовать страницы, на которых видно дайджест.

  Второй довод «page» обязателен. Без него revalidatePath сбрасывает и
  разметку тоже, роутер перестраивает кэш целиком и уходит на первую
  попавшуюся запись — на деле человека выбрасывало с панели на главную
  сайта прямо посреди работы.

  Сначала я списал это на другое: «/admin/news» подходит под шаблон
  «/[lang]/news» с lang = «admin», группы маршрутов в адрес не входят. Так
  и есть, и перечислять адреса полностью всё равно правильнее. Но уводило
  не поэтому — то же самое повторилось на «/admin/detectors», под шаблон не
  подходящем вовсе, и вылечилось именно этим доводом.
*/
function refresh(): void {
  revalidatePath("/admin/news", "page");
  for (const lang of READY_LANGUAGES) {
    revalidatePath(`/${lang}/news`, "page");
    revalidatePath(`/${lang}`, "page");
  }
}

export async function addSource(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireEditor();

  const parsed = sourceForm.safeParse({
    name: form.get("name"),
    feedUrl: form.get("feedUrl"),
    lang: form.get("lang"),
    takeAll: form.get("takeAll") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  }

  const exists = await db.newsSource.findUnique({
    where: { feedUrl: parsed.data.feedUrl },
    select: { name: true },
  });
  if (exists) return { error: `Такая лента уже есть: ${exists.name}` };

  await db.newsSource.create({ data: parsed.data });
  refresh();
  return { done: `Источник «${parsed.data.name}» добавлен` };
}

export async function toggleSource(form: FormData): Promise<void> {
  await requireEditor();

  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  const source = await db.newsSource.findUnique({
    where: { id },
    select: { enabled: true },
  });
  if (!source) return;

  await db.newsSource.update({
    where: { id },
    data: { enabled: !source.enabled },
  });
  refresh();
}

/*
  Удаление источника.

  Собранные заметки остаются: sourceId у них обнуляется, а подпись издания
  лежит отдельной колонкой и никуда не девается. Удалять вместе с ними было
  бы неожиданно — человек убирает ленту, а не полгода дайджеста.
*/
export async function removeSource(form: FormData): Promise<void> {
  await requireEditor();

  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  await db.newsSource.delete({ where: { id } });
  refresh();
}

const keywordForm = z.object({
  word: z
    .string()
    .trim()
    .min(3, "Слишком короткое слово поймает лишнее")
    .max(60),
  lang: langs,
});

export async function addKeyword(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireEditor();

  const parsed = keywordForm.safeParse({
    word: form.get("word"),
    lang: form.get("lang"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  }

  const { word, lang } = parsed.data;
  const exists = await db.newsKeyword.findUnique({
    where: { lang_word: { lang, word } },
    select: { id: true },
  });
  if (exists) return { error: `Слово «${word}» для этого языка уже есть` };

  await db.newsKeyword.create({ data: { word, lang } });
  refresh();
  return { done: `Слово «${word}» добавлено` };
}

export async function toggleKeyword(form: FormData): Promise<void> {
  await requireEditor();

  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  const word = await db.newsKeyword.findUnique({
    where: { id },
    select: { enabled: true },
  });
  if (!word) return;

  await db.newsKeyword.update({
    where: { id },
    data: { enabled: !word.enabled },
  });
  refresh();
}

export async function removeKeyword(form: FormData): Promise<void> {
  await requireEditor();

  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  await db.newsKeyword.delete({ where: { id } });
  refresh();
}

/**
 * Обойти ленты прямо сейчас.
 *
 * Обычно это делает расписание, но после правки списка слов ждать до утра
 * незачем — и, главное, только так видно, что новая настройка работает.
 */
export async function collectNow(): Promise<ActionState> {
  await requireEditor();

  try {
    const report = await collectNews();
    const working = report.sources.filter((item) => item.ok).length;
    refresh();
    return {
      done:
        `Обход закончен: новых заметок ${report.added}, ` +
        `источников ответило ${working} из ${report.sources.length}`,
    };
  } catch (error) {
    console.error("обход лент не удался:", error);
    return { error: "Обход не удался — подробности в журнале сервера" };
  }
}
