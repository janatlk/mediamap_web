"use client";

import { useActionState } from "react";

import { LANGUAGES, READY_LANGUAGES } from "@/lib/i18n/languages";
import { addVideoByLink, type VideoState } from "@/server/video-actions";

/*
  Загрузка ролика по ссылке.

  Ролик скачивается нашим сервисом разбора ссылок и откладывается
  черновиком: на сайт он попадёт только после того, как редактор посмотрит,
  что скачалось, и нажмёт «Подтвердить». По ссылке нередко приходит не то —
  обрезанный кусок, другая запись из карусели, реклама перед роликом.

  Ждать приходится до полутора минут: сервис сам ходит в соцсеть и качает
  файл. Поэтому кнопка говорит, что идёт работа, а не просто гаснет.
*/
export default function VideoLinkForm() {
  const [state, run, pending] = useActionState<VideoState, FormData>(
    addVideoByLink,
    {},
  );

  return (
    <form action={run}>
      <label>
        Ссылка на ролик (Instagram, TikTok, YouTube, Facebook):
        <br />
        <input
          name="link"
          type="url"
          size={60}
          required
          placeholder="https://www.instagram.com/reel/…"
        />
      </label>

      <label>
        Язык ролика:
        <br />
        <select name="lang" defaultValue="ru">
          {READY_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGES.find((item) => item.code === code)?.name ?? code}
            </option>
          ))}
        </select>
      </label>

      <label>
        Название (необязательно, можно вписать после):
        <br />
        <input name="title" size={60} maxLength={120} />
      </label>

      <p className="note">
        Скачивание занимает до полутора минут. Длинный ролик с YouTube может
        не пройти по размеру — тогда сервис скажет об этом, и такой ролик
        лучше нарезать.
      </p>

      <button type="submit" disabled={pending}>
        {pending ? "Скачиваю, подождите…" : "Скачать по ссылке"}
      </button>

      {state.error ? <p className="error">{state.error}</p> : null}
      {state.done ? <p className="note">{state.done}</p> : null}
    </form>
  );
}
