/*
  Полезные ресурсы: название и ссылка.

  Пояснения к каждому лежат в словаре (resourcesPage.notes.<id>) — их правят
  через панель, а адреса и порядок здесь: адрес не текст, и переводить его
  на два языка незачем.

  Список подобран мной, это черновик. Кыргызстанских проектов тут намеренно
  нет: поставить местную ссылку наугад хуже, чем не поставить вовсе, — на
  странице об этом сказано прямо.
*/

export type Resource = {
  /** Ключ пояснения в словаре. */
  id: string;
  name: string;
  url: string;
};

export type ResourceGroup = {
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
      {
        id: "cpj",
        name: "Committee to Protect Journalists",
        url: "https://cpj.org",
      },
      { id: "article19", name: "ARTICLE 19", url: "https://www.article19.org" },
      { id: "internews", name: "Internews", url: "https://internews.org" },
    ],
  },
];
