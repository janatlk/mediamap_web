"use client";

import { useActionState } from "react";

import type { TextEntry } from "@/server/content";
import { resetText, saveText, type TextState } from "@/server/text-actions";

/*
  Одна строка словаря.

  Клиентский компонент ради одного: не терять место на странице.

  Раньше это была обычная форма в серверном компоненте. Нажатие на
  «Сохранить» уходило переходом, страница отрисовывалась заново — и браузер
  ставил прокрутку в начало. На четырёхстах строках это значило искать
  заново то место, где ты только что правил. Так править нельзя: правок
  подряд обычно несколько.

  Через useActionState действие идёт запросом, а не переходом: страница
  остаётся на месте, а под кнопкой появляется «Сохранено».
*/
export default function TextRow({
  entry,
  section,
}: {
  entry: TextEntry;
  section: string;
}) {
  const [saved, save, saving] = useActionState<TextState, FormData>(saveText, {});
  const [restored, restore, restoring] = useActionState<TextState, FormData>(
    resetText,
    {},
  );

  // Длинному тексту нужно поле в несколько строк, короткому — одна.
  const isLong = entry.ru.length > 90;
  const note = saved.done || restored.done || saved.error || restored.error;

  const field = (name: "ru" | "ky" | "en", label: string, value: string) => (
    <label>
      {label}:
      <br />
      {isLong ? (
        <textarea name={name} rows={3} cols={70} defaultValue={value} />
      ) : (
        <input name={name} size={70} defaultValue={value} />
      )}
    </label>
  );

  return (
    <form action={save}>
      <input type="hidden" name="key" value={entry.key} />

      {/* У разделов из одной строки ключ совпадает с ключом раздела, и в
          заголовке он уже написан — повторять его строкой ниже незачем. */}
      <p className="id">
        {entry.key === section ? "" : entry.key}
        {entry.changed && entry.key !== section ? " · " : ""}
        {entry.changed ? <b>изменено</b> : ""}
      </p>

      {field("ru", "Русский", entry.ru)}
      <br />
      {field("ky", "Кыргызча", entry.ky)}
      <br />
      {field("en", "English", entry.en)}

      <p>
        <button type="submit" disabled={saving || restoring}>
          {saving ? "Сохраняю…" : "Сохранить"}
        </button>{" "}
        {/* Возврат к исходному тексту — не «очистить»: пустое поле оставило
            бы страницу без слов, а тут возвращается текст из словаря. */}
        {entry.changed ? (
          <button
            type="submit"
            className="danger"
            formAction={restore}
            disabled={saving || restoring}
          >
            {restoring ? "Возвращаю…" : "Вернуть исходный"}
          </button>
        ) : null}{" "}
        {note ? <span className="note">{note}</span> : null}
      </p>
    </form>
  );
}
