import { ArrowUpRight } from "lucide-react";

import { PARTNER_ROWS, type Partner } from "@/lib/partners";
import type { Dictionary } from "@/lib/i18n";

/*
  Место под баннеры доноров и партнёров.

  Пока это подписи, а не логотипы: файлов нам не присылали, а рисовать чужие
  товарные знаки самим нельзя. Разметка уже умеет показать картинку — как
  только logo появится в src/lib/partners.ts, подпись сменится на неё, и
  трогать этот файл не придётся.

  Ряд не карточки, а строка имён: на карточках пустое место под логотип
  читалось бы как незагрузившаяся картинка — ровно та беда, из-за которой
  с главной убирали тепловую карту.
*/

function Plate({ item, external }: { item: Partner; external: string }) {
  const body = item.logo ? (
    // Высота фиксированная, ширина по картинке: логотипы приходят разных
    // пропорций, и по ширине они разъезжались бы по вертикали.
    <img src={item.logo} alt={item.name} className="h-8 w-auto" />
  ) : (
    <span>{item.name}</span>
  );

  if (!item.url) {
    return <li className="flex items-center text-sm text-muted">{body}</li>;
  }

  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-1 text-sm text-muted transition-colors hover:text-signal"
      >
        {body}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{external}</span>
      </a>
    </li>
  );
}

export default function Partners({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
        <h2 className="eyebrow">{dict.partners.title}</h2>

        <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-x-12">
          {PARTNER_ROWS.map((row) => (
            <div key={row.id} className="contents">
              <p className="text-sm text-ink sm:pt-0.5">
                {row.id === "donors" ? dict.partners.donors : dict.partners.partners}
              </p>
              <ul className="flex flex-wrap items-center gap-x-8 gap-y-1">
                {row.items.map((item) => (
                  <Plate
                    key={item.name}
                    item={item}
                    external={dict.a11y.externalLink}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
