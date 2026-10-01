"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import { questionTexts } from "./quiz";
import { warmTranslations } from "./text-translation";

/*
  Правка вопросов теста из панели.

  Доступ проверяет каждое действие само: до серверного действия можно
  дотянуться по его адресу, минуя страницу.
*/

export type QuizState = { error?: string; done?: string };

const MAX_OPTIONS = 4;

const form = z.object({
  question: z.string().trim().min(8, "Вопрос слишком короткий").max(400),
  // Варианты приходят по одному полю на строку: так редактору не нужно
  // думать про запятые внутри самого варианта.
  options: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .refine((list) => list.length >= 2, "Нужно хотя бы два варианта")
    .refine((list) => list.length <= MAX_OPTIONS, `Вариантов не больше ${MAX_OPTIONS}`),
  correct: z.coerce.number().int().min(1, "Укажите номер верного варианта"),
  explanation: z.string().trim().max(600).optional(),
});

function refresh() {
  revalidatePath("/[lang]/quiz", "page");
  revalidatePath("/admin/quiz");
}

export async function addQuestion(
  _previous: QuizState,
  data: FormData,
): Promise<QuizState> {
  await requireEditor();

  const parsed = form.safeParse({
    question: data.get("question") ?? "",
    options: data.get("options") ?? "",
    correct: data.get("correct") ?? "",
    explanation: data.get("explanation") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { question, options, correct, explanation } = parsed.data;
  if (correct > options.length) {
    return { error: `Верный вариант ${correct}, а вариантов всего ${options.length}` };
  }

  const last = await db.quizQuestion.findFirst({ orderBy: { position: "desc" } });

  const row = await db.quizQuestion.create({
    data: {
      question,
      options: JSON.stringify(options),
      // В панели номера с единицы, людям так привычнее; внутри с нуля.
      correct: correct - 1,
      explanation: explanation || null,
      position: (last?.position ?? 0) + 1,
    },
  });

  // Перевод готовим заранее: страница берёт только готовые переводы.
  void warmTranslations(questionTexts(row)).catch((error) => {
    console.error("перевод вопроса не вышел:", error);
  });

  refresh();
  return { done: "Вопрос добавлен" };
}

export async function removeQuestion(data: FormData): Promise<void> {
  await requireEditor();
  await db.quizQuestion.delete({ where: { id: Number(data.get("id")) } }).catch(() => {});
  refresh();
}

export async function toggleQuestion(data: FormData): Promise<void> {
  await requireEditor();

  const id = Number(data.get("id"));
  const row = await db.quizQuestion.findUnique({ where: { id }, select: { published: true } });
  if (!row) return;

  await db.quizQuestion.update({ where: { id }, data: { published: !row.published } });
  refresh();
}

export async function shiftQuestion(data: FormData): Promise<void> {
  await requireEditor();

  const rows = await db.quizQuestion.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const at = rows.findIndex((row) => row.id === Number(data.get("id")));
  const to = data.get("up") !== null ? at - 1 : at + 1;
  if (at === -1 || to < 0 || to >= rows.length) return;

  [rows[at], rows[to]] = [rows[to], rows[at]];

  await db.$transaction(
    rows.map((row, index) =>
      db.quizQuestion.update({ where: { id: row.id }, data: { position: index } }),
    ),
  );

  refresh();
}
