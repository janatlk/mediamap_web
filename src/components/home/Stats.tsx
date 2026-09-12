import Link from "next/link";

import { FORMS, type Dictionary, type Lang } from "@/lib/i18n";
import { plural } from "@/lib/plural";

type Props = {
  dict: Dictionary;
  lang: Lang;
  caseCount: number;
  receivedCount: number;
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
/*
  Пара «получено — подтверждено» заменила «за последний месяц». Одно «7
  проверено» на главной и «54 сообщения» в «Аналитике» читались как
  противоречие; вместе они отвечают сразу и на «сколько к вам пишут», и на
  «сколько из этого правда». Каждое число ведёт туда, где его видно
  подробно.
*/
export default function Stats({
  dict,
  lang,
  caseCount,
  receivedCount,
  reviewDays,
}: Props) {
  const forms = FORMS[lang];

  const items: { value: number; word: string; tail: string; href?: string }[] = [
    {
      value: receivedCount,
      word: plural(receivedCount, forms.reports, lang),
      tail: dict.home.statReceived,
      href: `/${lang}/analytics`,
    },
    {
      value: caseCount,
      word: plural(caseCount, forms.cases, lang),
      tail: dict.home.statCases,
      href: `/${lang}/cases`,
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
          {items.map((item) => {
            const body = (
              <>
                {/* Числа набраны тем же крупным начертанием, что заголовки, и цвет им нужен тот же: иначе четыре чёрных числа спорят с заголовком раздела. */}
                <p className="font-display text-3xl text-display tabular-nums">{item.value}</p>
                <p className="mt-1 text-sm text-muted">
                  {item.word} {item.tail}
                </p>
              </>
            );
            const cell = "bg-surface px-4 py-6 sm:px-6 sm:py-7 lg:px-10";
            return item.href ? (
              <Link
                key={item.tail}
                href={item.href}
                className={`${cell} block transition-colors hover:bg-paper`}
              >
                {body}
              </Link>
            ) : (
              <div key={item.tail} className={cell}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
