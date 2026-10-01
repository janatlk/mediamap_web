import { db } from "@/lib/db";
import type { Lang } from "@/lib/i18n/languages";
import { translateTexts } from "./text-translation";

/*
  Вопросы теста «Проверь себя».

  Тест нужен не ради баллов: после ответа человек видит, почему верно именно
  это. Поэтому пояснение — полноценное поле, а не примечание, и редактор
  заполняет его вместе с вопросом.

  Тексты хранятся на языке редакции и переводятся готовыми переводами, без
  обращения к модели: вопросов на странице сразу десяток, и ждать её тут
  страница не станет.
*/

export type Question = {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string | null;
};

const parseOptions = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/** Вопросы для страницы, уже на языке читателя. */
export async function loadQuiz(lang: Lang): Promise<Question[]> {
  const rows = await db.quizQuestion.findMany({
    where: { published: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  const questions: Question[] = rows.map((row) => ({
    id: row.id,
    question: row.question,
    options: parseOptions(row.options),
    correct: row.correct,
    explanation: row.explanation,
  }));

  // Все тексты одной пачкой: отдельный запрос на каждую строку означал бы
  // десятки походов в базу ради одной страницы.
  const flat: string[] = [];
  for (const item of questions) {
    flat.push(item.question, ...item.options, item.explanation ?? "");
  }

  const done = await translateTexts(flat, lang, { live: false });

  let at = 0;
  for (const item of questions) {
    item.question = done[at++] ?? item.question;
    item.options = item.options.map((option) => done[at++] ?? option);
    const explanation = done[at++];
    item.explanation = item.explanation ? explanation : null;
  }

  return questions;
}

/** Всё подряд — для панели. */
export const loadAllQuestions = () =>
  db.quizQuestion.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });

/** Тексты вопроса — чтобы прогреть переводы после правки. */
export const questionTexts = (row: {
  question: string;
  options: string;
  explanation: string | null;
}): string[] => [row.question, ...parseOptions(row.options), row.explanation ?? ""];
