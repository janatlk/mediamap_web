"use client";

import { useActionState } from "react";

import { NEWS_LANGS, NEWS_LANG_NAMES } from "@/lib/news-langs";
import { addSource, type ActionState } from "@/server/news-actions";

/*
  Добавление ленты.

  Клиентский компонент только ради ответа: адрес ленты легко ввести с
  опечаткой, и человеку надо сказать, что именно не так, — а не молча
  перерисовать страницу без нового источника.
*/
export default function SourceForm() {
  const [state, run, pending] = useActionState<ActionState, FormData>(
    addSource,
    {},
  );

  return (
    <form action={run}>
      <label>
        Название:
        <br />
        <input name="name" size={40} required placeholder="24.kg" />
      </label>
      <label>
        Адрес ленты RSS или Atom:
        <br />
        <input
          name="feedUrl"
          size={70}
          required
          placeholder="https://24.kg/rss/"
        />
      </label>
      <label>
        Язык источника:
        <br />
        <select name="lang" defaultValue="ru">
          {NEWS_LANGS.map((lang) => (
            <option key={lang} value={lang}>
              {NEWS_LANG_NAMES[lang]}
            </option>
          ))}
        </select>
      </label>
      <p>
        <label>
          <input type="checkbox" name="takeAll" /> Брать всю ленту, минуя
          ключевые слова
        </label>
        <br />
        <span className="note">
          Только для изданий, которые целиком про нашу тему. Для обычной
          новостной ленты это означает прогноз погоды в дайджесте.
        </span>
      </p>

      <p>
        <button type="submit" disabled={pending}>
          {pending ? "Добавляю…" : "Добавить"}
        </button>
      </p>

      {state.error ? <p className="status">{state.error}</p> : null}
      {state.done ? <p className="note">{state.done}</p> : null}
    </form>
  );
}
