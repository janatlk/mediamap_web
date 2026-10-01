"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import { dropVideo, moveVideo, saveVideo } from "./videos";
import { warmTranslations } from "./text-translation";

/*
  Управление роликами из панели.

  Каждое действие проверяет доступ само: до серверного действия можно
  дотянуться по его адресу, минуя страницу, на которой оно стоит.

  Права те же, что у дайджеста и текстов сайта: это редакторская работа, а
  не работа с сообщениями заявителей.
*/

export type VideoState = { error?: string; done?: string };

/** Главная перерисовывается не сразу: она лежит в кэше на пять минут. */
function refresh() {
  revalidatePath("/[lang]", "page");
  revalidatePath("/admin/videos");
}

export async function addVideo(
  _previous: VideoState,
  form: FormData,
): Promise<VideoState> {
  await requireEditor();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Выберите файл с роликом" };
  }

  const result = await saveVideo(String(form.get("title") ?? ""), file);
  if ("error" in result) return { error: result.error };

  /*
    Название переводим заранее, как заголовки случаев: главная берёт только
    готовые переводы и модель не ждёт. Перевод идёт в фоне, ответа не ждём —
    иначе редактор смотрел бы на крутилку лишнюю минуту.
  */
  const title = String(form.get("title") ?? "").trim();
  void warmTranslations([title]).catch((error) => {
    console.error("перевод названия ролика не вышел:", error);
  });

  refresh();
  return { done: "Ролик добавлен" };
}

export async function removeVideo(form: FormData): Promise<void> {
  await requireEditor();
  await dropVideo(Number(form.get("id")));
  refresh();
}

export async function shiftVideo(form: FormData): Promise<void> {
  await requireEditor();
  await moveVideo(Number(form.get("id")), form.get("up") !== null);
  refresh();
}

/** Снятый с показа ролик остаётся в панели, но на сайте его нет. */
export async function toggleVideo(form: FormData): Promise<void> {
  await requireEditor();

  const id = Number(form.get("id"));
  const row = await db.video.findUnique({ where: { id }, select: { published: true } });
  if (!row) return;

  await db.video.update({ where: { id }, data: { published: !row.published } });
  refresh();
}
