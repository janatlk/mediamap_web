"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import type { VideoRow } from "@/server/videos";

/*
  Полка коротких роликов на главной.

  Ролики вертикальные, как в соцсетях, поэтому карточки 9:16 и стоят в ряд
  с прокруткой вбок: на телефоне это привычный жест, а на широком экране
  четыре помещаются целиком.

  Ничего не грузится, пока не нажали: preload="none" и обложка картинкой.
  Иначе главная тянула бы десятки мегабайт ради блока, до которого человек
  может и не долистать. Автозапуска нет намеренно — звук или движение без
  спроса раздражают, а у нас страница про доверие.
*/

type Props = { dict: Dictionary; videos: VideoRow[] };

export default function VideoShelf({ dict, videos }: Props) {
  const words = dict.home;
  if (videos.length === 0) return null;

  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
        <h2 className="text-2xl lg:text-3xl">{words.videoTitle}</h2>
        <p className="mt-2 max-w-prose text-muted">{words.videoLead}</p>

        {/* Прокрутка вбок, а не перенос: иначе на планшете последний ролик
            уезжал бы один во вторую строку. Отрицательные поля — чтобы
            карточки «утекали» за край страницы, как лента. */}
        <ul className="mt-8 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mt-12 lg:-mx-10 lg:px-10">
          {videos.map((video) => (
            <li
              key={video.id}
              /* Широкий ролик с YouTube в карточку под рилс не влезает:
                 он лёг бы чёрными полосами сверху и снизу. Поэтому у
                 широких карточка шире, а высота у всех одна — иначе ряд
                 выглядел бы лесенкой. */
              className={`shrink-0 snap-start ${
                video.wide ? "w-[85vw] sm:w-[25rem] lg:w-[28rem]" : "w-[70vw] sm:w-56 lg:w-64"
              }`}
            >
              <Card
                video={video}
                title={video.title}
                playLabel={words.videoPlay}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Card({
  video,
  title,
  playLabel,
}: {
  video: VideoRow;
  title: string;
  playLabel: string;
}) {
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLVideoElement>(null);

  return (
    <figure>
      <div
        className={`relative overflow-hidden rounded-xs bg-deep ${
          video.wide ? "aspect-video" : "aspect-[9/16]"
        }`}
      >
        <video
          ref={player}
          src={`/api/videos/${video.id}`}
          poster={video.hasPoster ? `/api/videos/${video.id}?poster` : undefined}
          preload="none"
          playsInline
          controls={playing}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="h-full w-full object-cover"
        />

        {/* Своя кнопка поверх обложки: пока ролик не запущен, нативные
            элементы плеера мы не показываем, иначе на каждой карточке
            висела бы чёрная панель. */}
        {playing ? null : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              void player.current?.play();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/90">
              <Play className="ml-0.5 h-6 w-6 text-ink" aria-hidden="true" />
            </span>
            <span className="sr-only">
              {playLabel}: {title}
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-3 text-base">
        {title}
        {video.seconds ? (
          <span className="mt-1 block text-sm text-muted tabular-nums">
            {Math.floor(video.seconds / 60)}:
            {String(video.seconds % 60).padStart(2, "0")}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
