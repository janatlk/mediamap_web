import type { Lang } from "@/lib/i18n";
import type { TrendPoint } from "@/server/home-data";

/*
  Линия тренда под долями видов: подтверждённые случаи по неделям.

  Нарочно голая — одна линия и даты под ней, без сетки, осей и точек.
  Это не график для изучения (он в «Аналитике»), а подсказка, куда
  движется счёт.

  Текущая неделя ещё не кончилась, и честный ноль в понедельник выглядел
  бы как обвал. Поэтому последний отрезок пунктирный: «пока так».

  Даты — подписями HTML под рисунком, а не текстом внутри SVG: рисунок
  растягивается по ширине, и текст внутри него поплыл бы вместе с ним.
*/

type Props = { points: TrendPoint[]; lang: Lang; caption: string };

const W = 100;
const H = 40;
// Запас сверху и снизу, чтобы толстая линия не срезалась краем.
const PAD = 3;

export default function TrendLine({ points, lang, caption }: Props) {
  if (points.length < 2) return null;

  const max = Math.max(1, ...points.map((point) => point.count));
  const xy = points.map((point, index) => [
    (index / (points.length - 1)) * W,
    H - PAD - (point.count / max) * (H - PAD * 2),
  ]);
  const line = (part: number[][]) => part.map(([x, y]) => `${x},${y}`).join(" ");

  const short = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const labels =
    points.length <= 4
      ? points
      : [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]];

  const summary = points
    .map((point) => `${short.format(point.week)}: ${point.count}`)
    .join(", ");

  return (
    <figure className="mt-10">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-16 w-full overflow-visible"
        role="img"
        aria-label={`${caption}. ${summary}`}
      >
        <polyline
          points={line(xy.slice(0, -1))}
          fill="none"
          stroke="var(--color-trend)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={line(xy.slice(-2))}
          fill="none"
          stroke="var(--color-trend)"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-2 flex justify-between text-xs text-muted tabular-nums" aria-hidden="true">
        {labels.map((point) => (
          <span key={point.week.getTime()}>{short.format(point.week)}</span>
        ))}
      </div>

      <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
