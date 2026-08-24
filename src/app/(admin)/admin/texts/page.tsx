import { requireEditor } from "@/lib/guard";
import { listTexts, type TextEntry } from "@/server/content";
import { resetText, saveText } from "@/server/text-actions";

export const metadata = { title: "Тексты сайта" };

// Правка текстов сайта.
//
// Каждая строка — своя форма и своя кнопка. Одна большая форма на весь
// словарь означала бы, что при сохранении улетают и чужие правки, сделанные
// в соседней вкладке.
//
// Поиска и разбивки по страницам нет намеренно: строк несколько сотен, они
// сгруппированы по разделам, и браузерный поиск по странице справляется
// лучше, чем ещё одно поле ввода.

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

function Row({ entry }: { entry: TextEntry }) {
  // Длинному тексту нужно поле в несколько строк, короткому — одна.
  const isLong = entry.ru.length > 90;

  return (
    <form>
      <input type="hidden" name="key" value={entry.key} />

      <p className="id">
        {entry.key}
        {entry.changed ? " · изменено" : ""}
      </p>

      <label>
        Русский:
        <br />
        {isLong ? (
          <textarea name="ru" rows={3} cols={70} defaultValue={entry.ru} />
        ) : (
          <input name="ru" size={70} defaultValue={entry.ru} />
        )}
      </label>
      <br />
      <label>
        Кыргызча:
        <br />
        {isLong ? (
          <textarea name="ky" rows={3} cols={70} defaultValue={entry.ky} />
        ) : (
          <input name="ky" size={70} defaultValue={entry.ky} />
        )}
      </label>
      <p>
        <button type="submit" formAction={saveText}>
          Сохранить
        </button>{" "}
        {/* Возврат к исходному тексту — не «очистить»: пустое поле оставило
            бы страницу без слов, а тут возвращается текст из словаря. */}
        {entry.changed ? (
          <button type="submit" formAction={resetText}>
            Вернуть исходный
          </button>
        ) : null}
      </p>
    </form>
  );
}

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

  return (
    <div className="panel">
      <h1>Тексты сайта</h1>
      <p className="lead">
        Правка заменяет текст из кода. Изменено {changed} из {entries.length}.
        Кнопка «вернуть исходный» убирает правку и возвращает текст,
        заложенный в сайт.
      </p>

      {[...groups].map(([section, rows]) => (
        <section key={section}>
          <h2>
            {SECTIONS[section] ?? section} <span className="id">{section}</span>
          </h2>

          {rows.map((entry) => (
            <Row key={entry.key} entry={entry} />
          ))}
        </section>
      ))}
    </div>
  );
}
