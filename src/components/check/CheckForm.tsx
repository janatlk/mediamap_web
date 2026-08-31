"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";

import { detectorById } from "@/lib/detectors";
import type { Dictionary } from "@/lib/i18n";
import type { Origin, ProvenanceResult } from "@/server/provenance";

/*
  Проверка изображения: выбор файла и показ разбора.

  Обычный fetch, а не серверное действие: разбор с наблюдениями модели идёт
  секунды, а действия в Next делят очередь с переходами по сайту — страница
  на это время замирала бы.

  Файл никуда не сохраняется. Сказано это один раз — до загрузки, вместе с
  тем, что он уходит сторонним сервисам. Повтор после ответа убран: человек
  к этому времени уже решил, загружать или нет.
*/

type DetectorScore = {
  service: string;
  score: number;
  generator: string | null;
};

type Answer =
  | { kind: "ok"; result: ProvenanceResult; detectors: DetectorScore[] }
  | { kind: "error"; code: string; seconds?: number };

/*
  Полоса над ответом говорит ровно одно: установили мы что-нибудь или нет.

  Цвета видов нарушений сюда не годятся — на сайте они означают вид
  нарушения, а «сгенерировано ИИ» нарушением не является. Красная полоса
  над таким ответом читалась бы как обвинение, которого мы не выносим.

  Поэтому два состояния: тёмная полоса — нашли, светлая — нет.
*/
const found = (origin: Origin) => origin !== "unknown";

export default function CheckForm({ dict }: { dict: Dictionary }) {
  const words = dict.checkPage;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const send = async (file: File) => {
    setPending(true);
    setAnswer(null);
    setName(file.name);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/check", { method: "POST", body });
      const data = (await response.json()) as
        | { status: "ok"; result: ProvenanceResult; detectors?: DetectorScore[] }
        | { status: "error"; error: string; seconds?: number };

      if (data.status === "ok") {
        setAnswer({
          kind: "ok",
          result: data.result,
          detectors: data.detectors ?? [],
        });
      } else {
        setAnswer({ kind: "error", code: data.error, seconds: data.seconds });
      }
    } catch {
      setAnswer({ kind: "error", code: "failed" });
    } finally {
      setPending(false);
    }
  };

  const errorText = (code: string, seconds?: number) => {
    if (code === "wait") {
      return words.errors.wait.replace("{n}", String(seconds ?? 0));
    }
    return words.errors[code as keyof typeof words.errors] ?? words.errors.failed;
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
          // Сбрасываем, иначе тот же файл второй раз не выберется.
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ImageUp className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? words.working : words.choose}
      </button>

      {name ? <p className="mt-3 text-sm text-muted">{name}</p> : null}

      {answer?.kind === "error" ? (
        <p className="mt-6 border-l-2 border-signal pl-4 text-muted">
          {errorText(answer.code, answer.seconds)}
        </p>
      ) : null}

      {answer?.kind === "ok" ? (
        <Result dict={dict} data={answer.result} detectors={answer.detectors} />
      ) : null}
    </div>
  );
}

function Result({
  dict,
  data,
  detectors,
}: {
  dict: Dictionary;
  data: ProvenanceResult;
  detectors: DetectorScore[];
}) {
  const words = dict.checkPage;

  /*
    Ответ сервиса стоит первым и один.

    Раньше страница начиналась с нашего собственного вывода по метаданным —
    «Сказать нечего: следов не осталось» — и человек, пришедший спросить
    «настоящее ли это фото», первым делом читал абзац о том, почему мы не
    отвечаем. Ответ, за которым он пришёл, лежал третьим блоком ниже, да
    ещё в двух экземплярах от двух сервисов с разными числами.

    Теперь наоборот: сначала оценка, потом то, что записано в файле, —
    сырыми строчками, без нашего пересказа.
  */
  const verdict = detectors[0] ?? null;

  return (
    <section className="mt-8 border-t border-line pt-8">
      {verdict ? (
        <Verdict
          words={words}
          name={detectorById(verdict.service)?.name ?? verdict.service}
          score={verdict.score}
          generator={verdict.generator}
        />
      ) : (
        <p className="max-w-prose text-muted">{words.detectorNone}</p>
      )}

      {/*
        Оговорка про скриншоты. Осталась одна и только там, где меняет
        отношение к числу выше: файл прошёл через соцсеть или снят с
        экрана — на таких сервис и ошибается.
      */}
      {verdict && !found(data.origin) ? (
        <p className="mt-4 max-w-prose text-sm text-muted">
          {words.detectorsNoteStripped}
        </p>
      ) : null}

      <Metadata words={words} data={data} />

      {/*
        Наблюдения модели — только когда они есть. Пустой блок с подписью
        «Модель ничего не отметила» занимал место и ничего не сообщал.
      */}
      {data.observations.length > 0 ? (
        <div className="mt-8 border border-line p-5">
          <h3 className="eyebrow">{words.observationsTitle}</h3>
          <p className="mt-2 max-w-prose text-sm text-muted">
            {words.observationsNote}
          </p>
          <ul className="mt-4">
            {data.observations.map((item, index) => (
              <li key={index} className="mt-2 text-sm">
                <span className="text-ink">{item.where}</span>
                <span className="text-muted"> — {item.what}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/*
  Что записано в самом файле — как есть.

  Нашего разбора здесь больше нет: был вывод словами («следов не осталось»,
  «так выглядит любой скриншот»), и он занимал верх страницы, повторяя одно
  и то же почти на каждом файле. Показываем строки EXIF под их собственными
  именами: марка камеры, выдержка, дата съёмки. Названия не переводим — они
  одинаковы во всех программах, и человек, который их знает, узнаёт их
  именно такими.
*/
function Metadata({
  words,
  data,
}: {
  words: Dictionary["checkPage"];
  data: ProvenanceResult;
}) {
  const rows = Object.entries(data.camera ?? {});
  const empty = rows.length === 0 && !data.generator && !data.signed;

  return (
    <div className="mt-8">
      <h3 className="eyebrow">{words.metaTitle}</h3>

      {empty ? (
        <p className="mt-3 max-w-prose text-sm text-muted">{words.metaNone}</p>
      ) : (
        <dl className="mt-3">
          {/* Подпись и генератор идут первыми: это не настройка съёмки, а
              заявление файла о собственном происхождении. */}
          {data.signed ? (
            <Row name={words.metaSigned} value={words.metaSignedYes} />
          ) : null}
          {data.generator ? (
            <Row name={words.metaGenerator} value={data.generator} />
          ) : null}
          {rows.map(([name, value]) => (
            <Row key={name} name={name} value={value} />
          ))}
        </dl>
      )}
    </div>
  );
}

function Row({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 border-b border-line py-2">
      <dt className="w-44 shrink-0 font-mono text-sm text-muted">{name}</dt>
      <dd className="min-w-0 break-words text-sm">{value}</dd>
    </div>
  );
}

/*
  Главный ответ: слово, число и полоса.

  Слово говорит, что это значит, число — насколько сервис уверен. Порознь
  они хуже: одно слово скрывает разницу между 0.51 и 0.99, одно число
  ничего не значит человеку, который не знает шкалы.

  Цвет у полосы один на все значения — тёмный. Красить высокие оценки
  тревожным цветом было бы обвинением: сгенерированное изображение само по
  себе не нарушение, а страницу открывают и просто из любопытства.
*/
function Verdict({
  words,
  name,
  score,
  generator,
}: {
  words: Dictionary["checkPage"];
  name: string;
  score: number;
  generator: string | null;
}) {
  const percent = Math.round(score * 100);

  return (
    <div>
      <h2 className="text-2xl">{said(words, score)}</h2>

      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-line"
          role="img"
          aria-label={`${words.detectorScale}: ${percent}%`}
        >
          {/* Минимум в один процент: при 0.006 полоса иначе исчезает
              совсем, и человек решает, что её не нарисовали. */}
          <span
            className="block h-full rounded-full bg-ink"
            style={{ width: `${Math.max(1, percent)}%` }}
          />
        </div>
        <span className="w-12 text-right font-mono text-base tabular-nums">
          {percent}%
        </span>
      </div>

      <p className="mt-2 text-sm text-muted">
        {words.detectorScale} · {name}
      </p>

      {generator ? (
        <p className="mt-3 text-sm text-muted">
          {words.detectorGenerator} {generator}
        </p>
      ) : null}
    </div>
  );
}

/** Ответ словом. Число рядом — на полосе. */
function said(words: Dictionary["checkPage"], score: number): string {
  if (score >= 0.9) return words.detectorSure;
  if (score >= 0.5) return words.detectorLikely;
  if (score >= 0.1) return words.detectorUnlikely;
  return words.detectorNo;
}
