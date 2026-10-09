"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import { fetchVideo, LinkError } from "./cobalt";
import { dropVideo, moveVideo, saveVideo, storeVideo } from "./videos";

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

  const result = await saveVideo(
    String(form.get("title") ?? ""),
    String(form.get("lang") ?? ""),
    file,
  );
  if ("error" in result) return { error: result.error };

  refresh();
  return { done: "Ролик добавлен" };
}

/**
 * Скачивает ролик по ссылке и откладывает его черновиком.
 *
 * Сразу на сайт не ставим: по ссылке приходит то, что отдала соцсеть, и
 * это может оказаться не тем роликом, обрезанным куском или рекламой.
 * Редактор смотрит, что скачалось, и подтверждает.
 */
export async function addVideoByLink(
  _previous: VideoState,
  form: FormData,
): Promise<VideoState> {
  await requireEditor();

  const link = String(form.get("link") ?? "").trim();
  if (!/^https?:\/\//i.test(link)) return { error: "Нужна ссылка, начиная с http" };

  try {
    const file = await fetchVideo(link);
    const result = await storeVideo({
      // Название из ссылки — черновик: у YouTube там заголовок ролика, у
      // соцсетей обычно мусор вроде instagram_12345.
      title: String(form.get("title") ?? "").trim() || file.title || link,
      lang: String(form.get("lang") ?? ""),
      data: file.data,
      mime: file.mime,
      sourceUrl: link,
      draft: true,
    });

    if ("error" in result) return { error: result.error };

    refresh();
    return { done: "Скачано. Посмотрите, что получилось, и подтвердите" };
  } catch (error) {
    if (error instanceof LinkError) return { error: error.message };
    console.error("загрузка по ссылке не вышла:", error);
    return { error: "Скачать не вышло. Подробности в журнале сервера" };
  }
}

/** Редактор посмотрел черновик и согласился его показывать. */
export async function confirmVideo(form: FormData): Promise<void> {
  await requireEditor();
  await db.video
    .update({ where: { id: Number(form.get("id")) }, data: { draft: false } })
    .catch(() => {});
  refresh();
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
