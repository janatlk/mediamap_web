"use server";

import {
  isTranslationLang,
  translateNewsItem,
  type Translated,
} from "./translate";

// Перевод по кнопке в ленте.
//
// Действием, а не при сборке страницы: переводить все двадцать заметок ради
// одного человека, которому нужна одна, — это минуты работы модели впустую.
// Переводим то, что попросили, и запоминаем.

export type TranslateState =
  | { status: "ok"; text: Translated }
  | { status: "error" };

export async function translateNews(
  newsId: number,
  lang: string,
): Promise<TranslateState> {
  // Язык приходит из браузера — сверяем со своим списком, а не доверяем.
  if (!isTranslationLang(lang)) return { status: "error" };

  try {
    return { status: "ok", text: await translateNewsItem(newsId, lang) };
  } catch (error) {
    // В журнал — с причиной, человеку — что перевод не вышел. Показывать
    // ему «сервис ответил 503» незачем, а нам знать надо.
    console.error("перевод новости не удался:", error);
    return { status: "error" };
  }
}
