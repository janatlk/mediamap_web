"use client";

import { useActionState } from "react";

import { VIDEO_ACCEPT, VIDEO_MAX_BYTES } from "@/lib/video-rules";
import { addVideo, type VideoState } from "@/server/video-actions";

/*
  Добавление ролика.

  Клиентский компонент ради ответа: файл на десятки мегабайт грузится
  небыстро, и человеку надо видеть, что идёт работа, а при отказе — почему
  именно отказали.
*/
export default function VideoForm() {
  const [state, run, pending] = useActionState<VideoState, FormData>(addVideo, {});

  return (
    <form action={run}>
      <label>
        Название ролика:
        <br />
        <input
          name="title"
          size={60}
          required
          maxLength={120}
          placeholder="Как узнать мошенника в переписке"
        />
      </label>

      <label>
        Файл (mp4, webm или mov, до {Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} МБ):
        <br />
        <input type="file" name="file" accept={VIDEO_ACCEPT} required />
      </label>

      <p className="note">
        Вертикальные ролики, как в соцсетях, подходят лучше всего: на главной
        они стоят в ряд с прокруткой. Обложку сервер снимет сам с первой
        секунды. Название переведётся на кыргызский и английский в фоне.
      </p>

      <button type="submit" disabled={pending}>
        {pending ? "Загружаю…" : "Добавить"}
      </button>

      {state.error ? <p className="error">{state.error}</p> : null}
      {state.done ? <p className="note">{state.done}</p> : null}
    </form>
  );
}
