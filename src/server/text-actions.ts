"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import { getDictionary } from "@/lib/i18n";

// Правка текстов сайта.

/**
 * Что действие сообщает форме.
 *
 * Раньше действия ничего не возвращали, и форма в серверном компоненте
 * отправлялась переходом: страница перерисовывалась, прокрутка уезжала в
 * начало, и на четырёхстах строках приходилось заново искать место правки.
 * Теперь ответ идёт в useActionState, страница остаётся на месте, а человек
 * видит под кнопкой, что сохранилось.
 */
export type TextState = { done?: string; error?: string };

/**
 * Сохраняет одну строку.
 *
 * Если значения совпали со словарём, правку удаляем, а не храним копию:
 * так в таблице остаётся только то, что действительно менялось, и видно,
 * за что администратор брался.
 */
export async function saveText(
  _state: TextState,
  form: FormData,
): Promise<TextState> {
  await requireEditor();

  const key = String(form.get("key") ?? "");
  const valueRu = String(form.get("ru") ?? "").trim();
  const valueKy = String(form.get("ky") ?? "").trim();
  const valueEn = String(form.get("en") ?? "").trim();
  if (!key) return { error: "нет ключа" };

  const path = key.split(".");
  const read = (lang: "ru" | "ky" | "en") =>
    String(
      path.reduce<unknown>(
        (value, part) =>
          value && typeof value === "object"
            ? (value as Record<string, unknown>)[part]
            : undefined,
        getDictionary(lang),
      ) ?? "",
    );

  const isDefault =
    valueRu === read("ru") && valueKy === read("ky") && valueEn === read("en");

  if (isDefault) {
    await db.siteText.deleteMany({ where: { key } });
  } else {
    await db.siteText.upsert({
      where: { key },
      create: { key, valueRu, valueKy, valueEn, category: path[0] ?? "general" },
      update: { valueRu, valueKy, valueEn },
    });
  }

  /*
    Публичные страницы собраны заранее — без пересборки правка на них не
    появится. А вот саму панель здесь не обновляем: значение и так стоит в
    поле, которое человек только что заполнил, а лишнее обновление вернуло
    бы ровно ту потерю места, ради которой всё и переделано.
  */
  revalidatePath("/", "layout");

  return { done: isDefault ? "совпало со словарём — правка снята" : "сохранено" };
}

/** Возвращает исходный текст: удаляет правку. */
export async function resetText(
  _state: TextState,
  form: FormData,
): Promise<TextState> {
  await requireEditor();

  const key = String(form.get("key") ?? "");
  if (!key) return { error: "нет ключа" };

  await db.siteText.deleteMany({ where: { key } });
  revalidatePath("/", "layout");

  return { done: "возвращён исходный текст — обновите страницу" };
}
