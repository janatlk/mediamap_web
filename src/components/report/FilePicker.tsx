"use client";

import { useEffect, useRef, useState } from "react";
import { ImageDown, Paperclip, X } from "lucide-react";

import { ACCEPT, LIMITS, megabytes, ruleFor } from "@/lib/attachment-rules";
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

  Три способа приложить файл, и это не роскошь. Человек, увидевший нарушение,
  жмёт PrtScn и идёт на сайт — а там его заставляли сохранить снимок в файл,
  вспомнить куда, и найти его в диалоге. Вставка из буфера убирает три шага
  из четырёх; перетаскивание — для тех, у кого файл уже лежит на виду.
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

/** Один и тот же файл, приложенный дважды. */
const same = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Имя для снимка из буфера.
 *
 * Браузер отдаёт вставленный снимок как «image.png» — три вставки подряд
 * дают три одинаковые строки в списке, и человек не понимает, что приложил.
 * Время в имени различает их и заодно уезжает в хранилище.
 */
function named(file: File, prefix: string): File {
  const now = new Date();
  const stamp = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

  const ext = ruleFor(file.type)?.ext ?? "png";
  return new File([file], `${prefix} ${stamp}.${ext}`, { type: file.type });
}

export default function FilePicker({ dict, lang }: Props) {
  const page = dict.reportPage;
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  /** Файл тащат над окном — показываем накрывающую подсказку. */
  const [dragging, setDragging] = useState(false);
  /** Что не взяли и почему. Пусто — всё в порядке. */
  const [refused, setRefused] = useState<string | null>(null);
  /** Сколько раз курсор с файлом вошёл в элементы страницы. См. ниже. */
  const depth = useRef(0);

  // Единственный источник правды — input: его читает сервер. Состояние
  // только повторяет содержимое, чтобы было что показать.
  const sync = (next: File[]) => {
    const box = new DataTransfer();
    next.forEach((file) => box.items.add(file));
    if (input.current) input.current.files = box.files;
    setFiles(next);
  };

  /*
    Общий вход для всех трёх способов.

    Здесь же отбор по типу. Диалог выбора файлов фильтрует сам, а
    перетаскивание и буфер — нет: туда прилетает что угодно, вплоть до PDF и
    ярлыков. Без отбора такое молча уезжало бы на сервер и возвращалось
    ошибкой уже после отправки; теперь отказ виден сразу и рядом с кнопкой.
  */
  const add = (incoming: File[] | FileList | null, rename?: string) => {
    if (!incoming) return;

    const arriving = Array.from(incoming).filter((file) => file.size > 0);
    if (arriving.length === 0) return;

    const good = arriving.filter((file) => ruleFor(file.type));
    const wrongType = arriving.length - good.length;

    const fresh = good
      .filter((file) => !files.some((have) => same(have, file)))
      .map((file) => (rename ? named(file, rename) : file));

    const room = Math.max(0, LIMITS.FILES - files.length);
    const taken = fresh.slice(0, room);
    const overflow = fresh.length - taken.length;

    if (taken.length > 0) sync([...files, ...taken]);

    setRefused(
      wrongType > 0
        ? page.filesWrongType
        : overflow > 0
          ? page.filesTooMany.replace("{n}", String(LIMITS.FILES))
          : null,
    );
  };

  /*
    Вставка из буфера.

    Слушаем на всём документе, а не на поле: человек только что нажал PrtScn
    и жмёт Ctrl+V там, где стоит курсор, — обычно в поле рассказа. Требовать
    «сначала встаньте на нужное поле» значит не сделать ничего.

    Текст не трогаем: если в буфере картинок нет, событие идёт своим ходом и
    вставляется как обычно. Картинку в текстовое поле браузер всё равно не
    вставит, так что перехват здесь ничего не отнимает.
  */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      const images = pasted.filter((file) => ruleFor(file.type));
      if (images.length === 0) return;

      event.preventDefault();
      add(images, page.filesPastedName);
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  /*
    Перетаскивание — на всю страницу, а не в рамку под кнопкой.

    Прицеливаться в маленький прямоугольник неудобно, а промах стоит дорого:
    файл, отпущенный мимо, браузер открывает вместо страницы, и заполненная
    форма пропадает. Раз уж промах всё равно надо гасить — примем файл в
    любой точке и скажем об этом заранее, накрыв страницу подсказкой.

    Считаем вход и выход, а не смотрим на одно событие: dragleave срабатывает
    на каждом вложенном элементе, и подсказка мигала бы, пока файл едет над
    страницей. Счётчик обнуляется — значит курсор ушёл за пределы окна.

    Показываем только для файлов: выделенный текст и ссылки тоже создают
    перетаскивание, и накрывать ради них страницу незачем.
  */
  useEffect(() => {
    const withFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const onEnter = (event: DragEvent) => {
      if (!withFiles(event)) return;
      depth.current += 1;
      setDragging(true);
    };

    const onLeave = (event: DragEvent) => {
      if (!withFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };

    // Без preventDefault на dragover браузер не считает страницу приёмником
    // и drop до нас не доходит вовсе.
    const onOver = (event: DragEvent) => event.preventDefault();

    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (withFiles(event)) add(event.dataTransfer?.files ?? null);
    };

    document.addEventListener("dragenter", onEnter);
    document.addEventListener("dragleave", onLeave);
    document.addEventListener("dragover", onOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onEnter);
      document.removeEventListener("dragleave", onLeave);
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("drop", onDrop);
    };
  });

  const total = files.reduce((sum, file) => sum + file.size, 0);

  const limits = page.filesLimits
    .replace("{files}", String(LIMITS.FILES))
    .replace("{image}", String(megabytes(LIMITS.IMAGE_BYTES)))
    .replace("{video}", String(megabytes(LIMITS.VIDEO_BYTES)));

  return (
    <div>
      <span className="text-base font-medium">{page.filesLabel}</span>
      {page.filesHint ? (
        <p className="mt-1 text-sm text-muted">{page.filesHint}</p>
      ) : null}

      {/*
        Зона перетаскивания. Пунктир — чтобы отличалась от полей ввода:
        сплошная рамка на сайте значит «сюда печатают».

        onDragLeave срабатывает и при переходе на вложенный элемент, поэтому
        сверяем, ушёл ли курсор из самой зоны, — иначе подсветка мигает, пока
        тащишь файл над кнопкой внутри.
      */}
      {/* Рамка ничего не ловит — перетаскивание принимает вся страница. Она
          осталась знаком «сюда можно бросить»: без него о такой возможности
          человек не догадается, пока случайно не потащит файл над окном. */}
      <div className="mt-3 flex flex-col items-start gap-2 rounded-xs border border-dashed border-border px-4 py-4">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xs border border-border bg-surface px-4 text-base transition-colors hover:bg-paper focus-within:border-ink">
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

        <p className="text-sm text-muted">{page.filesDropHint}</p>
      </div>

      {/*
        Подсказка на всё окно. Появляется, только пока файл тащат.

        aria-hidden: перетаскивание мышью — не тот путь, которым пользуются с
        экранного диктора, а всплывшее посреди страницы объявление сбило бы
        чтение. Тем, кто читает страницу, остаются кнопка и список файлов.
      */}
      {dragging ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 backdrop-blur-[2px]"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 border-2 border-dashed border-ink bg-surface px-10 py-12 text-center">
            <ImageDown className="h-10 w-10 text-signal" aria-hidden="true" />
            <p className="text-lg">{page.filesDropNow}</p>
            <p className="text-sm text-muted">{limits}</p>
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-sm text-muted">{limits}</p>

      {/* Отказ говорим вслух: он приходит в ответ на действие человека, и
          молча проглоченный файл выглядит как поломка. */}
      {refused ? (
        <p aria-live="polite" className="mt-2 text-sm text-signal">
          {refused}
        </p>
      ) : null}

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
                onClick={() => {
                  setRefused(null);
                  sync(files.filter((_, at) => at !== index));
                }}
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
