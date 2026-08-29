"use client";

import { useActionState } from "react";

import type { NewsLang } from "@/lib/news-langs";
import { addKeyword, type ActionState } from "@/server/news-actions";

/*
  Добавление ключевого слова для одного языка.

  Форма своя у каждого языка, а не одна с выбором языка: списки стоят рядом
  со своими словами, и «добавить сюда» читается без лишнего поля.
*/
export default function KeywordForm({ lang }: { lang: NewsLang }) {
  const [state, run, pending] = useActionState<ActionState, FormData>(
    addKeyword,
    {},
  );

  return (
    <form action={run}>
      <input type="hidden" name="lang" value={lang} />
      <label>
        Основа слова:
        <br />
        <input
          name="word"
          size={40}
          required
          minLength={3}
          placeholder="мошенничеств"
        />
      </label>
      <p>
        <button type="submit" disabled={pending}>
          {pending ? "Добавляю…" : "Добавить слово"}
        </button>
      </p>

      {state.error ? <p className="status">{state.error}</p> : null}
      {state.done ? <p className="note">{state.done}</p> : null}
    </form>
  );
}
