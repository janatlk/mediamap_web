import Link from "next/link";

import TextRow from "@/components/admin/TextRow";
import { requireEditor } from "@/lib/guard";
import { listTexts, type TextEntry } from "@/server/content";

export const metadata = { title: "Тексты сайта" };

/*
  Правка текстов сайта.

  Строк почти пятьсот, и раньше они выводились все разом. Страница выходила
  длиной в несколько экранов подряд: добраться до подвала значило
  пролистать весь словарь, а найдя нужное место и сохранив, потерять его
  снова. Теперь за раз показывается один раздел, а искать можно по словам.

  Поиск серверный и идёт по тексту на всех трёх языках, а не только по
  ключу: администратор помнит фразу, которую видел на сайте, а не то, что
  она лежит в reportPage.fields.story.label.

  Каждая строка по-прежнему своя форма со своей кнопкой. Одна большая форма
  на весь раздел означала бы, что при сохранении улетают и чужие правки,
  сделанные в соседней вкладке.
*/

export const dynamic = "force-dynamic";

/** Человеческие названия разделов словаря. */
const SECTIONS: Record<string, string> = {
  brand: "Название проекта",
  brandTagline: "Подпись под названием",
  nav: "Навигация",
  home: "Главная",
  cases: "Случаи",
  account: "Личный кабинет",
  myReports: "Мои сообщения",
  typesPage: "Виды нарушений",
  newsPage: "Медиа-дайджест",
  aboutPage: "О проекте",
  contactsPage: "Контакты",
  reportPage: "Форма сообщения",
  assessment: "Предварительная оценка",
  violations: "Описания видов нарушений",
  checkPage: "Проверка изображения",
  glossary: "Глоссарий: статьи",
  glossaryPage: "Глоссарий: страница",
  analyticsPage: "Аналитика",
  searchPage: "Поиск по сайту",
  resourcesPage: "Полезные материалы",
  quizPage: "Тест «Проверь себя»",
  partners: "Блок партнёров",
  qrCover: "Предупреждение о QR-коде",
  footer: "Подвал сайта",
  a11y: "Для скринридеров",
};

/** Сколько найденного показываем за раз: больше — снова длинная страница. */
const MAX_FOUND = 60;

const title = (section: string) => SECTIONS[section] ?? section;

type Query = { section?: string; q?: string; changed?: string };

export default async function TextsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  await requireEditor();

  const query = await searchParams;
  const needle = (query.q ?? "").trim().toLowerCase();
  const onlyChanged = query.changed === "1";

  const entries = await listTexts();

  // Группируем по первому куску ключа: home.title и home.lead рядом.
  const groups = new Map<string, TextEntry[]>();
  for (const entry of entries) {
    const section = entry.key.split(".")[0];
    groups.set(section, [...(groups.get(section) ?? []), entry]);
  }

  const changedTotal = entries.filter((entry) => entry.changed).length;
  const changedIn = (rows: TextEntry[]) => rows.filter((row) => row.changed).length;

  /*
    Что показываем. Три состояния, и все три — короткая страница:
    найденное по словам, только правленое или один выбранный раздел.
    Ничего не выбрано — показываем оглавление и ждём, это честнее, чем
    вываливать первый попавшийся раздел.
  */
  const matches = (entry: TextEntry) =>
    `${entry.key} ${entry.ru} ${entry.ky} ${entry.en}`.toLowerCase().includes(needle);

  const found = needle
    ? entries.filter(matches)
    : onlyChanged
      ? entries.filter((entry) => entry.changed)
      : [];

  const section =
    !needle && !onlyChanged && query.section && groups.has(query.section)
      ? query.section
      : null;

  const rows = section ? (groups.get(section) ?? []) : found.slice(0, MAX_FOUND);

  const href = (params: Query) => {
    const search = new URLSearchParams();
    if (params.section) search.set("section", params.section);
    if (params.q) search.set("q", params.q);
    if (params.changed) search.set("changed", params.changed);
    const line = search.toString();
    return line ? `/admin/texts?${line}` : "/admin/texts";
  };

  return (
    <div className="panel">
      <h1>Тексты сайта</h1>
      <p className="lead">
        Правка заменяет текст из кода. Изменено {changedTotal} из {entries.length}.
      </p>

      {/* Поиск обычной формой методом GET: запрос остаётся в адресе, и
          найденное можно оставить в закладке или переслать коллеге. */}
      <form className="search" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          size={40}
          placeholder="Найти текст или ключ"
          aria-label="Поиск по текстам сайта"
        />{" "}
        <button type="submit">Найти</button>{" "}
        {needle ? (
          <Link href={href({})} className="note">
            сбросить
          </Link>
        ) : null}
      </form>

      <nav className="toc">
        <Link href={href({ changed: "1" })}>
          <b>Изменённые</b>
          {changedTotal > 0 ? ` (${changedTotal})` : ""}
        </Link>

        {[...groups].map(([name, list]) => (
          <Link
            key={name}
            href={href({ section: name })}
            aria-current={name === section ? "page" : undefined}
          >
            {name === section ? <b>{title(name)}</b> : title(name)}
            {changedIn(list) > 0 ? ` (${changedIn(list)})` : ""}
          </Link>
        ))}
      </nav>

      {section ? (
        <h2>
          {title(section)} <span className="id">{section}</span>
        </h2>
      ) : null}

      {/* Подвал собран из трёх разных разделов словаря, и человек, не
          нашедший в «Подвале» названия ссылок, решает, что подвал не
          правится вовсе. Говорим прямо, где лежит остальное. */}
      {section === "footer" ? (
        <p className="note">
          Здесь строка о правах, ссылка для сотрудников и дисклеймер донора.
          Названия ссылок в подвале лежат в разделе «Навигация», а название
          проекта и подпись под ним — в «Название проекта» и «Подпись под
          названием». Год подставляется сам.
        </p>
      ) : null}

      {needle ? (
        <h2>
          Найдено: {found.length}
          {found.length > MAX_FOUND ? ` · показаны первые ${MAX_FOUND}` : ""}
        </h2>
      ) : null}

      {!needle && onlyChanged ? <h2>Изменённые тексты</h2> : null}

      {!section && !needle && !onlyChanged ? (
        <p className="note">
          Выберите раздел выше или найдите текст по словам — строка ищется на
          всех трёх языках и по ключу.
        </p>
      ) : null}

      {(needle || onlyChanged) && found.length === 0 ? (
        <p className="note">
          {needle
            ? "Ничего не нашлось. Попробуйте одно слово вместо фразы."
            : "Пока ничего не правили."}
        </p>
      ) : null}

      {rows.map((entry) => (
        <div key={entry.key}>
          {/* В найденном показываем, из какого раздела строка: без этого
              непонятно, где этот текст увидит посетитель. */}
          {section ? null : (
            <p className="id">{title(entry.key.split(".")[0])}</p>
          )}
          <TextRow entry={entry} section={section ?? ""} />
        </div>
      ))}
    </div>
  );
}
