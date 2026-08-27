import { percent } from "@/lib/format";
import { FORMS, type Lang } from "@/lib/i18n";
import { withCount } from "@/lib/plural";

/*
  Список с полосками: вид нарушения, площадка, область.

  Один компонент на три раздела аналитики, потому что вопрос у них один —
  «чего больше» — и отвечать на него по-разному значило бы заставлять
  человека трижды разбираться в новой картинке.

  Полоска горизонтальная и подписана словом слева, числом справа. Круговой
  диаграммы тут нет намеренно: доли по площадкам сравнивают глазами, а
  сектора сравниваются хуже всего, что придумано.

  Длина полоски — ровно та доля, что подписана под ней. Сначала шкала шла
  по самой длинной строке: список площадок так читался лучше, но у «языка
  вражды» полоска в 55% ширины стояла над подписью «35%». Полоска, которая
  спорит с числом под собой, хуже короткой полоски.

  Цвет полоски необязателен. Там, где строки — это виды нарушений, он несёт
  смысл и совпадает с меткой вида по всему сайту. Там, где это площадки или
  области, цвета нет: сущность называет подпись, и раскрашивать её значило
  бы завести восемь цветов, ничего не значащих.
*/

export type BarRow = {
  key: string;
  label: string;
  count: number;
  /** Класс фона вида: bg-hate и подобные. Пусто — нейтральная полоска. */
  color?: string;
  /** Подпись под строкой: например, «доля от всех». */
  note?: string;
};

type Props = {
  rows: BarRow[];
  /** К чему считать долю. Обычно всего случаев. */
  total: number;
  /** Что показать вместо списка, когда строк нет. */
  empty: string;
  /** Нужен только счётчику: «1 случай», «2 случая», «5 случаев». */
  lang: Lang;
};

export default function Bars({ rows, total, empty, lang }: Props) {
  if (rows.length === 0) return <p className="mt-6 text-muted">{empty}</p>;

  return (
    <ul className="mt-6 space-y-5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base">{row.label}</span>
            <span className="text-sm tabular-nums text-muted">
              {withCount(row.count, FORMS[lang].cases, lang)}
            </span>
          </div>

          {/* Полоска декоративная: всё, что она показывает, стоит рядом
              числом. Отсюда aria-hidden — скринридеру её пересказывать
              незачем. */}
          <div className="mt-2 h-1.5 w-full bg-line" aria-hidden="true">
            <div
              className={`h-full ${row.color ?? "bg-ink"}`}
              style={{ width: `${percent(row.count, total)}%` }}
            />
          </div>

          <p className="mt-1.5 text-sm text-muted">
            {row.note ?? `${percent(row.count, total)}%`}
          </p>
        </li>
      ))}
    </ul>
  );
}
