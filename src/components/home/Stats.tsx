import { FORMS, type Dictionary, type Lang } from "@/lib/i18n";
import { plural } from "@/lib/plural";

type Props = {
  dict: Dictionary;
  lang: Lang;
  caseCount: number;
  typeCount: number;
  sourceCount: number;
  newsCount: number;
};

/** Полоса с числами. Все из базы, декоративных нет. */
export default function Stats({
  dict,
  lang,
  caseCount,
  typeCount,
  sourceCount,
  newsCount,
}: Props) {
  const forms = FORMS[lang];

  const items = [
    { value: caseCount, word: plural(caseCount, forms.cases, lang), tail: dict.home.statCases },
    { value: typeCount, word: plural(typeCount, forms.types, lang), tail: dict.home.statTypes },
    { value: sourceCount, word: plural(sourceCount, forms.sources, lang), tail: dict.home.statSources },
    { value: newsCount, word: plural(newsCount, forms.news, lang), tail: dict.home.statNews },
  ];

  return (
    <section className="border-y border-line bg-surface">
      {/* Полоса во всю ширину, но числа стоят на той же вертикали, что и
          заголовки соседних блоков: иначе левый край страницы «гуляет».
          Отсюда отрицательные поля — они гасят внутренний отступ ячейки. */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="-mx-4 grid grid-cols-2 gap-px bg-line sm:-mx-6 sm:grid-cols-4 lg:-mx-10">
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
