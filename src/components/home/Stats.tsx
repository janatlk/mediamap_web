import { FORMS, type Dictionary, type Lang } from "@/lib/i18n";
import { plural } from "@/lib/plural";

type Props = {
  dict: Dictionary;
  lang: Lang;
  caseCount: number;
  recentCount: number;
  reviewDays: number | null;
};

/*
  Полоса с числами.

  Было четыре, стало три, и дело не в тесноте. Прежние четыре отвечали не на
  те вопросы: «3 вида нарушений» — константа, которая не менялась ни разу;
  «13 площадок под наблюдением» считало разные сайты в ссылках и обещало
  наблюдение, которого нет; «95 новостей собрано» — про работу нашего
  сборщика, а не про положение дел в медиа.

  Осталось то, что меняется и что-то значит человеку: сколько случаев
  подтверждено, сколько из них — за последний месяц, и за сколько дней мы
  отвечаем. Последнее — то самое обещание, которое на форме дано словами
  («обычно несколько дней»), только числом и потому проверяемое.

  Срока может не быть: пока рассмотренных меньше трёх, среднее — это
  пересказ двух случаев. Тогда плашек две, и это честнее выдуманной третьей.
*/
export default function Stats({
  dict,
  lang,
  caseCount,
  recentCount,
  reviewDays,
}: Props) {
  const forms = FORMS[lang];

  const items = [
    {
      value: caseCount,
      word: plural(caseCount, forms.cases, lang),
      tail: dict.home.statCases,
    },
    {
      value: recentCount,
      word: plural(recentCount, forms.cases, lang),
      tail: dict.home.statRecent,
    },
    ...(reviewDays === null
      ? []
      : [
          {
            value: reviewDays,
            word: plural(reviewDays, forms.days, lang),
            tail: dict.home.statReviewDays,
          },
        ]),
  ];

  return (
    <section className="border-y border-line bg-surface">
      {/* Полоса во всю ширину, но числа стоят на той же вертикали, что и
          заголовки соседних блоков: иначе левый край страницы «гуляет».
          Отсюда отрицательные поля — они гасят внутренний отступ ячейки. */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="-mx-4 grid grid-cols-2 gap-px bg-line sm:-mx-6 sm:grid-cols-3 lg:-mx-10">
          {items.map((item) => (
            <div key={item.tail} className="bg-surface px-4 py-6 sm:px-6 sm:py-7 lg:px-10">
              {/* Числа набраны тем же крупным начертанием, что заголовки, и цвет им нужен тот же: иначе четыре чёрных числа спорят с заголовком раздела. */}
              <p className="font-display text-3xl text-display tabular-nums">{item.value}</p>
              <p className="mt-1 text-sm text-muted">
                {item.word} {item.tail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
