"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import { getDictionary } from "@/lib/i18n";

// Правка текстов сайта.

/**
 * Сохраняет одну строку.
 *
 * Если значения совпали со словарём, правку удаляем, а не храним копию:
 * так в таблице остаётся только то, что действительно менялось, и видно,
 * за что администратор брался.
 */
export async function saveText(form: FormData): Promise<void> {
  await requireEditor();

  const key = String(form.get("key") ?? "");
  const valueRu = String(form.get("ru") ?? "").trim();
  const valueKy = String(form.get("ky") ?? "").trim();
  if (!key) return;

  const path = key.split(".");
  const read = (lang: "ru" | "ky") =>
    String(
      path.reduce<unknown>(
        (value, part) =>
          value && typeof value === "object"
            ? (value as Record<string, unknown>)[part]
            : undefined,
        getDictionary(lang),
      ) ?? "",
    );

  const isDefault = valueRu === read("ru") && valueKy === read("ky");

  if (isDefault) {
    await db.siteText.deleteMany({ where: { key } });
  } else {
    await db.siteText.upsert({
      where: { key },
      create: { key, valueRu, valueKy, category: path[0] ?? "general" },
      update: { valueRu, valueKy },
    });
  }

  // Страницы собраны заранее — без пересборки правка не появится.
  revalidatePath("/", "layout");
  revalidatePath("/admin/texts");
}

/** Возвращает исходный текст: удаляет правку. */
export async function resetText(form: FormData): Promise<void> {
  await requireEditor();

  const key = String(form.get("key") ?? "");
  if (!key) return;

  await db.siteText.deleteMany({ where: { key } });
  revalidatePath("/", "layout");
  revalidatePath("/admin/texts");
}
