/*
  Доноры и партнёры для баннерного блока на главной.

  Имена взяты дословно из текста «Кто поддерживает проект» на странице
  «О проекте» — придумывать своих формулировок тут нельзя, это обязательство
  перед теми, кто финансирует проект.

  Логотипы лежат в public/partners/. Присланы проектом одним архивом на
  228 МБ: официальные наборы визуальной идентичности, где по десятку
  форматов на каждый логотип и файлы для печати на сотни мегабайт. Для
  сайта из них взято по одному файлу, обрезаны прозрачные поля и высота
  приведена к 64 пикселям — вдвое больше показываемых 32, под экраны с
  двойной плотностью. Все три вместе весят 23 КБ.

  У кого logo пусто — логотипа нам не присылали, и в блоке стоит подпись.
  Разметка умеет и то и другое: положите файл в public/partners/ и впишите
  путь, трогать компонент не придётся.

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
      {
        name: "Co-funded by the European Union",
        url: "https://european-union.europa.eu",
        logo: "/partners/eu.png",
      },
      {
        name: "Canal France International (CFI)",
        url: "https://www.cfi.fr",
        logo: "/partners/cfi.svg",
      },
      { name: "Internews", url: "https://internews.org" },
    ],
  },
  {
    id: "partners",
    items: [
      { name: "AGILE", logo: "/partners/agile.png" },
      { name: "Фонд развития медиаконсалтинга в ЦА" },
      { name: "Ассоциация общественных СМИ Кыргызстана (АОСМИ)" },
      { name: "Thomson Media", url: "https://www.thomsonmedia.de" },
      { name: "ARTICLE 19", url: "https://www.article19.org" },
      { name: "Fojo Media Institute", url: "https://fojo.se" },
    ],
  },
];
