import TextRow from "@/components/admin/TextRow";
import { requireEditor } from "@/lib/guard";
import { listTexts, type TextEntry } from "@/server/content";

export const metadata = { title: "Тексты сайта" };

// Правка текстов сайта.
//
// Каждая строка — своя форма и своя кнопка. Одна большая форма на весь
// словарь означала бы, что при сохранении улетают и чужие правки, сделанные
// в соседней вкладке.
//
// Поиска и разбивки по страницам нет намеренно: строк несколько сотен, они
// сгруппированы по разделам, и браузерный поиск по странице справляется
// лучше, чем ещё одно поле ввода. Но пролистывать четыреста строк, чтобы
// добраться до подвала, тоже нельзя — отсюда оглавление наверху.

export const dynamic = "force-dynamic";

/** Человеческие названия разделов словаря. */
const SECTIONS: Record<string, string> = {
  brand: "Название проекта",
  brandTagline: "Подпись под названием",
  nav: "Навигация",
  home: "Главная",
  cases: "Случаи",
  typesPage: "Виды нарушений",
  newsPage: "Новости",
  aboutPage: "О проекте",
  contactsPage: "Контакты",
  reportPage: "Форма сообщения",
  assessment: "Предварительная оценка",
  violations: "Описания видов нарушений",
  footer: "Подвал",
  a11y: "Для скринридеров",
};

export default async function TextsPage() {
  await requireEditor();
  const entries = await listTexts();

  // Группируем по первому куску ключа: home.title и home.lead рядом.
  const groups = new Map<string, TextEntry[]>();
  for (const entry of entries) {
    const section = entry.key.split(".")[0];
    groups.set(section, [...(groups.get(section) ?? []), entry]);
  }

  const changed = entries.filter((entry) => entry.changed).length;
  const changedIn = (rows: TextEntry[]) => rows.filter((row) => row.changed).length;

  return (
    <div className="panel">
      <h1>Тексты сайта</h1>
      <p className="lead">
        Правка заменяет текст из кода. Изменено {changed} из {entries.length}.
      </p>

      {/*
        Оглавление. Строк четыреста с лишним, и до подвала приходилось
        крутить весь словарь. Рядом с разделом — сколько в нём правленого:
        иначе найти собственную вчерашнюю правку можно было только глазами.
      */}
      <nav className="toc">
        {[...groups].map(([section, rows]) => (
          <a key={section} href={`#${section}`}>
            {SECTIONS[section] ?? section}
            {changedIn(rows) > 0 ? ` (${changedIn(rows)})` : ""}
          </a>
        ))}
      </nav>

      {[...groups].map(([section, rows]) => (
        <section key={section} id={section}>
          <h2>
            {SECTIONS[section] ?? section} <span className="id">{section}</span>
          </h2>

          {rows.map((entry) => (
            <TextRow key={entry.key} entry={entry} section={section} />
          ))}
        </section>
      ))}
    </div>
  );
}
