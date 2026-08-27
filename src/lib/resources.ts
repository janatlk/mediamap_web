// Полезные ресурсы: чужие сайты, которые пригодятся человеку, решившему
// проверить публикацию самостоятельно.
//
// Здесь только название и адрес — то, что одинаково на обоих языках. Будь
// адрес в словаре, его пришлось бы править дважды, и однажды переводы
// разъехались бы. Пояснение к ресурсу — текст, поэтому оно живёт в словаре
// по ключу id: resourcesPage.notes.tineye.
//
// Список начальный: внесены только те адреса, в которых мы уверены.
// Кыргызстанских ресурсов тут пока нет намеренно — их перечень должен
// прийти от проекта, а выдуманная ссылка хуже отсутствующей.

export type Resource = {
  /** Ключ пояснения в словаре. */
  id: string;
  name: string;
  url: string;
};

export type ResourceGroup = {
  /** Ключ заголовка группы в словаре: resourcesPage.groups.verify. */
  id: "verify" | "factcheck" | "freedom";
  items: Resource[];
};

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    id: "verify",
    items: [
      {
        id: "factCheckExplorer",
        name: "Google Fact Check Explorer",
        url: "https://toolbox.google.com/factcheck/explorer",
      },
      { id: "tineye", name: "TinEye", url: "https://tineye.com" },
      { id: "bellingcat", name: "Bellingcat", url: "https://www.bellingcat.com" },
    ],
  },

  {
    id: "factcheck",
    items: [
      {
        id: "ifcn",
        name: "International Fact-Checking Network",
        url: "https://www.poynter.org/ifcn/",
      },
      { id: "factcheckOrg", name: "FactCheck.org", url: "https://www.factcheck.org" },
      { id: "snopes", name: "Snopes", url: "https://www.snopes.com" },
    ],
  },

  {
    id: "freedom",
    items: [
      { id: "cpj", name: "Committee to Protect Journalists", url: "https://cpj.org" },
      { id: "article19", name: "ARTICLE 19", url: "https://www.article19.org" },
      { id: "internews", name: "Internews", url: "https://internews.org" },
    ],
  },
];
