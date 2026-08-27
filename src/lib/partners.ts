// Партнёры и доноры: место под баннеры внизу главной и на странице
// «О проекте».
//
// Пока это не картинки, а подписи. Так сделано намеренно: логотипов нам не
// присылали, а рисовать их самим нельзя — это чужие товарные знаки со
// своими правилами использования. Как только файлы появятся, их кладут в
// public/partners/ и вписывают в logo — разметка уже готова их показать.
//
// Адрес указан только там, где мы в нём уверены. Организация без адреса
// показывается подписью без ссылки: битая ссылка на донора хуже, чем её
// отсутствие.

export type Partner = {
  name: string;
  /** Ссылка на сайт организации. Пусто — покажем подписью без ссылки. */
  url?: string;
  /** Путь к файлу в public, например /partners/internews.svg. */
  logo?: string;
};

export type PartnerRow = {
  /** Ключ подписи ряда в словаре: partners.donors, partners.partners. */
  id: "donors" | "partners";
  items: Partner[];
};

export const PARTNER_ROWS: PartnerRow[] = [
  {
    id: "donors",
    items: [
      { name: "Европейский союз", url: "https://europa.eu" },
      { name: "Canal France International (CFI)", url: "https://www.cfi.fr" },
      { name: "Internews", url: "https://internews.org" },
    ],
  },

  {
    id: "partners",
    items: [
      { name: "Фонд развития медиаконсалтинга в ЦА" },
      { name: "Ассоциация общественных СМИ Кыргызстана (АОСМИ)" },
      { name: "ARTICLE 19", url: "https://www.article19.org" },
      { name: "Fojo Media Institute", url: "https://fojo.se" },
      { name: "Thomson Media" },
    ],
  },
];
