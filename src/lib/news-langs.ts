/*
  Языки источников дайджеста.

  Это не языки сайта: сайт говорит по-русски и по-кыргызски, а читаем мы ещё
  и англоязычные организации — CPJ, IFEX, ARTICLE 19. Держать один список на
  оба случая значило бы однажды завести англоязычный интерфейс, которого
  никто не просил.

  Язык у источника, а не у заметки: по трём словам заголовка язык
  определяется плохо, а язык ленты известен точно.
*/

export const NEWS_LANGS = ["ru", "ky", "en"] as const;

export type NewsLang = (typeof NEWS_LANGS)[number];

export const NEWS_LANG_NAMES: Record<NewsLang, string> = {
  ru: "Русский",
  ky: "Кыргызча",
  en: "English",
};

export const isNewsLang = (value: string): value is NewsLang =>
  (NEWS_LANGS as readonly string[]).includes(value);
