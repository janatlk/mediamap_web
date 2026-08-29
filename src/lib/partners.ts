/*
  Доноры и партнёры для баннерного блока на главной.

  Имена взяты дословно из текста «Кто поддерживает проект» на странице
  «О проекте» — придумывать своих формулировок тут нельзя, это обязательство
  перед теми, кто финансирует проект.

  Логотипов нам не присылали, поэтому logo пусто и в блоке стоят подписи.
  Разметка уже умеет показать картинку: положите файл в public/partners/ и
  впишите путь — трогать компонент не придётся.

  Кто донор, а кто партнёр — решает проект. Если разложено не так, правится
  здесь, в одном месте.
*/

export type Partner = {
  name: string;
  /** Куда ведёт подпись. Пусто — подпись не ссылка. */
  url?: string;
  /** Путь к логотипу в public/. Пусто — показываем имя текстом. */
  logo?: string;
};

export type PartnerRow = {
  id: "donors" | "partners";
  items: Partner[];
};

export const PARTNER_ROWS: PartnerRow[] = [
  {
    id: "donors",
    items: [
      { name: "Европейский Союз", url: "https://european-union.europa.eu" },
      { name: "Canal France International (CFI)", url: "https://www.cfi.fr" },
      { name: "Internews", url: "https://internews.org" },
    ],
  },
  {
    id: "partners",
    items: [
      { name: "Фонд развития медиаконсалтинга в ЦА" },
      { name: "Ассоциация общественных СМИ Кыргызстана (АОСМИ)" },
      { name: "Thomson Media", url: "https://www.thomsonmedia.de" },
      { name: "ARTICLE 19", url: "https://www.article19.org" },
      { name: "Fojo Media Institute", url: "https://fojo.se" },
    ],
  },
];
