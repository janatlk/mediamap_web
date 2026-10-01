"use client";

import { useActionState } from "react";

import { addQuestion, type QuizState } from "@/server/quiz-actions";

/*
  Добавление вопроса теста.

  Варианты вводятся по одному в строку, а не через запятую: запятая внутри
  самого варианта — обычное дело, и редактору пришлось бы о ней думать.
*/
export default function QuestionForm() {
  const [state, run, pending] = useActionState<QuizState, FormData>(addQuestion, {});

  return (
    <form action={run}>
      <label>
        Вопрос:
        <br />
        <textarea
          name="question"
          rows={3}
          cols={70}
          required
          placeholder="Вам пишет «служба безопасности банка» и просит код из СМС. Что это?"
        />
      </label>

      <label>
        Варианты ответа, по одному в строке (от двух до четырёх):
        <br />
        <textarea
          name="options"
          rows={4}
          cols={70}
          required
          placeholder={"Обычная проверка банка\nМошенничество\nОшибка оператора"}
        />
      </label>

      <label>
        Номер верного варианта (считая сверху, с единицы):
        <br />
        <input type="number" name="correct" min={1} max={4} required size={4} />
      </label>

      <label>
        Почему верно именно это:
        <br />
        <textarea
          name="explanation"
          rows={3}
          cols={70}
          placeholder="Банк никогда не спрашивает код из СМС: этим кодом подтверждают перевод."
        />
      </label>

      <p className="note">
        Пояснение показывается сразу после ответа — ради него тест и нужен.
        Вопрос и варианты переведутся на кыргызский и английский в фоне.
      </p>

      <button type="submit" disabled={pending}>
        {pending ? "Сохраняю…" : "Добавить вопрос"}
      </button>

      {state.error ? <p className="error">{state.error}</p> : null}
      {state.done ? <p className="note">{state.done}</p> : null}
    </form>
  );
}
