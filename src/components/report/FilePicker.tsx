"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

import { ACCEPT, LIMITS, megabytes } from "@/lib/attachment-rules";
import type { Dictionary, Lang } from "@/lib/i18n";

/*
  Выбор снимков и записей.

  Штатный <input type="file"> показывает «Файлы не выбраны» и ничего больше:
  человек не видит, что именно приложил и сколько это весит. Поэтому сам
  input спрятан, а список рисуем свой.

  Спрятан он видимо для клавиатуры и для чтения с экрана — sr-only, а не
  display:none. Иначе поле выпадает из обхода по Tab, и приложить файл без
  мыши становится нельзя.

  Файлы держим в состоянии и перекладываем обратно в input через
  DataTransfer: убрать один файл из выбранного набора штатными средствами
  нельзя, список у input только для чтения.
*/

type Props = { dict: Dictionary; lang: Lang };

/*
  «2,4 МБ» — человеку, а не «2516582».

  Ниже мегабайта считаем в килобайтах: снимок окна весит сотни килобайт, и
  «0 МБ» рядом с ним выглядит как несработавшая загрузка.
*/
const readable = (bytes: number, lang: Lang): string => {
  const locale = lang === "ky" ? "ky-KG" : "ru-RU";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} КБ`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString(locale, {
    maximumFractionDigits: 1,
  })} МБ`;
};

export default function FilePicker({ dict, lang }: Props) {
  const page = dict.reportPage;
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  // Единственный источник правды — input: его читает сервер. Состояние
  // только повторяет содержимое, чтобы было что показать.
  const sync = (next: File[]) => {
    const box = new DataTransfer();
    next.forEach((file) => box.items.add(file));
    if (input.current) input.current.files = box.files;
    setFiles(next);
  };

  const add = (incoming: FileList | null) => {
    if (!incoming) return;
    sync([...files, ...Array.from(incoming)].slice(0, LIMITS.FILES));
  };

  const total = files.reduce((sum, file) => sum + file.size, 0);

  const limits = page.filesLimits
    .replace("{files}", String(LIMITS.FILES))
    .replace("{image}", String(megabytes(LIMITS.IMAGE_BYTES)))
    .replace("{video}", String(megabytes(LIMITS.VIDEO_BYTES)));

  return (
    <div>
      <span className="text-base font-medium">
        {page.filesLabel}
        <span className="ml-2 text-sm font-normal text-muted">
          {page.optional}
        </span>
      </span>
      <p className="mt-1 text-sm text-muted">{page.filesHint}</p>

      <label className="mt-3 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xs border border-border bg-surface px-4 text-base transition-colors hover:bg-paper focus-within:border-ink">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        {page.filesChoose}
        <input
          ref={input}
          id="files"
          type="file"
          name="files"
          multiple
          accept={ACCEPT}
          onChange={(event) => add(event.target.files)}
          className="sr-only"
        />
      </label>

      <p className="mt-2 text-sm text-muted">{limits}</p>

      {files.length > 0 ? (
        <ul className="mt-4 border-t border-line">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 border-b border-line py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <span className="text-sm tabular-nums text-muted">
                {readable(file.size, lang)}
              </span>
              <button
                type="button"
                onClick={() => sync(files.filter((_, at) => at !== index))}
                aria-label={`${page.filesRemove}: ${file.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-border transition-colors hover:bg-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <p className="mt-2 text-sm text-muted">
          {page.filesTotal}: {readable(total, lang)}
        </p>
      ) : null}
    </div>
  );
}
