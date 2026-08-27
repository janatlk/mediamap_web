import { Search } from "lucide-react";

import type { Dictionary, Lang } from "@/lib/i18n";

/*
  Строка поиска. Обычная форма с методом GET и без единой строчки на
  клиенте: запрос уезжает в адрес, страницу с результатами можно переслать
  или положить в закладки, и работает она с выключенным JavaScript.

  Живой подсказки под полем нет намеренно. Она стоила бы запроса на каждую
  букву — по всей базе случаев и трёмстам новостям, которые мы перебираем в
  коде, — и первой же легла бы на сервере, где эта база лежит файлом.
*/
export default function SearchBox({
  dict,
  lang,
  query,
  autoFocus,
}: {
  dict: Dictionary;
  lang: Lang;
  query?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action={`/${lang}/search`} method="get" className="flex gap-2">
      <label htmlFor="q" className="sr-only">
        {dict.searchPage.title}
      </label>

      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={dict.searchPage.placeholder}
          autoFocus={autoFocus}
          className="h-12 w-full rounded-xs border border-border bg-surface pr-4 pl-9 text-base"
        />
      </div>

      <button
        type="submit"
        className="h-12 rounded-xs bg-ink px-6 text-base font-medium text-surface transition-colors hover:bg-signal"
      >
        {dict.searchPage.action}
      </button>
    </form>
  );
}
