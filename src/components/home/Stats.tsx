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
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.tail} className="bg-surface px-4 py-6 sm:px-6 sm:py-7">
            <p className="font-display text-3xl tabular-nums">{item.value}</p>
            <p className="mt-1 text-sm text-muted">
              {item.word} {item.tail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
