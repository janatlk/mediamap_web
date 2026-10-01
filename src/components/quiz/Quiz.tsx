"use client";

import { useState } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import type { Question } from "@/server/quiz";

/*
  Тест «Проверь себя».

  Вопросы идут по одному. Ответ сразу показывает, верно или нет, и почему
  именно так: ради пояснения тест и затевался, иначе он просто считает очки.

  Счёт не отправляется на сервер и нигде не хранится. Это не экзамен, а
  способ проверить себя; собирать, кто сколько набрал, значит заводить
  данные о человеке, которые нам не нужны.
*/

type Props = { dict: Dictionary; questions: Question[] };

export default function Quiz({ dict, questions }: Props) {
  const words = dict.quizPage;

  const [at, setAt] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  const item = questions[at];
  const answered = chosen !== null;
  const last = at === questions.length - 1;

  if (done) {
    return (
      <section className="mt-10 border-t border-line pt-8">
        <p className="eyebrow">{words.resultTitle}</p>
        <p className="mt-3 font-display text-4xl tabular-nums">
          {right} / {questions.length}
        </p>
        <p className="mt-3 max-w-prose text-muted">
          {right === questions.length
            ? words.resultAll
            : right * 2 >= questions.length
              ? words.resultGood
              : words.resultPoor}
        </p>

        <button
          type="button"
          onClick={() => {
            setAt(0);
            setChosen(null);
            setRight(0);
            setDone(false);
          }}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {words.again}
        </button>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-line pt-8">
      <p className="eyebrow">
        {words.progress
          .replace("{n}", String(at + 1))
          .replace("{total}", String(questions.length))}
      </p>

      <h2 className="mt-3 max-w-prose text-2xl">{item.question}</h2>

      <ul className="mt-6 max-w-2xl space-y-3">
        {item.options.map((option, index) => {
          const isRight = index === item.correct;
          const picked = chosen === index;

          /*
            После ответа подсвечиваем и выбранное, и верное: если человек
            ошибся, ему нужно увидеть не только «не то», но и «а надо было
            вот это». Цвет не единственный признак — рядом стоит значок.
          */
          const look = !answered
            ? "border-border hover:bg-surface"
            : isRight
              ? "border-trust-high bg-surface"
              : picked
                ? "border-signal bg-surface"
                : "border-line text-muted";

          return (
            <li key={option}>
              <button
                type="button"
                disabled={answered}
                onClick={() => {
                  setChosen(index);
                  if (isRight) setRight((value) => value + 1);
                }}
                className={`flex w-full items-start gap-3 rounded-xs border px-5 py-4 text-left text-base transition-colors ${look}`}
              >
                <span className="flex-1">{option}</span>
                {answered && isRight ? (
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-trust-high" aria-hidden="true" />
                ) : null}
                {answered && picked && !isRight ? (
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {answered ? (
        <div className="mt-6 max-w-prose border-l-2 border-line pl-4">
          <p className="text-base font-medium">
            {chosen === item.correct ? words.right : words.wrong}
          </p>
          {item.explanation ? (
            <p className="mt-2 text-muted">{item.explanation}</p>
          ) : null}
        </div>
      ) : null}

      {answered ? (
        <button
          type="button"
          onClick={() => {
            if (last) {
              setDone(true);
              return;
            }
            setAt((value) => value + 1);
            setChosen(null);
          }}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
        >
          {last ? words.finish : words.next}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
