import { RotateCcw } from "lucide-react";

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

const inputStyle =
  "w-full rounded-xs border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-ink";

function Row({ entry }: { entry: TextEntry }) {
  // Длинному тексту нужно поле в несколько строк, короткому — одна.
  const isLong = entry.ru.length > 90;

  return (
    <form className="border-b border-line px-5 py-4">
      <input type="hidden" name="key" value={entry.key} />

      <div className="flex flex-wrap items-center gap-3">
        <code className="font-mono text-2xs text-muted">{entry.key}</code>
        {entry.changed ? (
          <span className="rounded-xs bg-paper px-2 py-0.5 text-2xs text-muted">
            изменено
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="text-2xs text-muted">Русский</span>
          {isLong ? (
            <textarea name="ru" rows={3} defaultValue={entry.ru} className={`${inputStyle} mt-1 resize-y`} />
          ) : (
            <input name="ru" defaultValue={entry.ru} className={`${inputStyle} mt-1`} />
          )}
        </label>

        <label className="block">
          <span className="text-2xs text-muted">Кыргызча</span>
          {isLong ? (
            <textarea name="ky" rows={3} defaultValue={entry.ky} className={`${inputStyle} mt-1 resize-y`} />
          ) : (
            <input name="ky" defaultValue={entry.ky} className={`${inputStyle} mt-1`} />
          )}
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          formAction={saveText}
          className="inline-flex h-10 items-center rounded-xs bg-ink px-4 text-sm font-medium text-surface"
        >
          Сохранить
        </button>

        {/* Возврат к исходному тексту — не «очистить»: пустое поле оставило
            бы страницу без слов, а тут возвращается текст из словаря. */}
        {entry.changed ? (
          <button
            type="submit"
            formAction={resetText}
            className="inline-flex h-10 items-center gap-1.5 rounded-xs border border-border px-4 text-sm transition-colors hover:bg-paper"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Вернуть исходный
          </button>
        ) : null}
      </div>
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
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <h1 className="text-2xl">Тексты сайта</h1>
      <p className="mt-2 max-w-prose text-muted">
        Правка заменяет текст из кода. Изменено {changed} из {entries.length}.
        Кнопка «вернуть исходный» убирает правку и возвращает текст,
        заложенный в сайт.
      </p>

      <div className="mt-10 space-y-10">
        {[...groups].map(([section, rows]) => (
          <section key={section}>
            <h2 className="text-lg">
              {SECTIONS[section] ?? section}{" "}
              <span className="font-mono text-2xs text-muted">{section}</span>
            </h2>

            <div className="mt-3 border border-line bg-surface">
              {rows.map((entry) => (
                <Row key={entry.key} entry={entry} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
