"use client";

import { useActionState } from "react";

import { collectNow, type ActionState } from "@/server/news-actions";

/*
  «Собрать сейчас».

  Обычно ленты обходит расписание, но после правки списка слов ждать до утра
  незачем — и, главное, только так видно, что новая настройка работает.

  Обход идёт секунд десять, поэтому кнопка на время работы блокируется и
  честно говорит, что делает. Без этого по ней нажимают трижды и запускают
  три обхода разом.
*/
export default function CollectButton() {
  // Данных форма не несёт, но useActionState в <form action> всё равно
  // получает FormData — принимаем и не смотрим.
  const [state, run, pending] = useActionState<ActionState, FormData>(
    async () => collectNow(),
    {},
  );

  return (
    <form action={run}>
      <p>
        <button type="submit" disabled={pending}>
          {pending ? "Обхожу ленты…" : "Собрать сейчас"}
        </button>{" "}
        <span className="note">
          Займёт около десяти секунд. Обычно это делает расписание.
        </span>
      </p>

      {state.error ? <p className="status">{state.error}</p> : null}
      {state.done ? <p className="note">{state.done}</p> : null}
    </form>
  );
}
