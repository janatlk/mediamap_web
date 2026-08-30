"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, ShieldCheck } from "lucide-react";

import { detectorById } from "@/lib/detectors";
import type { Dictionary } from "@/lib/i18n";
import type { Origin, ProvenanceResult } from "@/server/provenance";

/*
  Проверка изображения: выбор файла и показ разбора.

  Обычный fetch, а не серверное действие: разбор с наблюдениями модели идёт
  секунды, а действия в Next делят очередь с переходами по сайту — страница
  на это время замирала бы.

  Файл никуда не сохраняется. Так и написано на странице: рубрика открыта
  всем, и обещание стоит того, чтобы быть правдой.
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

  return (
    <section className="mt-8 border-t border-line pt-8">
      <span
        className={`block h-1 w-16 ${found(data.origin) ? "bg-ink" : "bg-line"}`}
        aria-hidden="true"
      />

      <h2 className="mt-4 text-2xl">{data.headline}</h2>
      <p className="mt-3 max-w-prose text-muted">{data.explain}</p>

      {/* Улики. Показываем всегда, даже когда их нет: там тогда написано,
          где именно мы смотрели, — иначе пустое место читается как поломка. */}
      <h3 className="mt-8 eyebrow">{words.evidenceTitle}</h3>
      <ul className="mt-3">
        {data.evidence.map((item, index) => (
          <li key={`${item.layer}-${index}`} className="border-b border-line py-3">
            <p className="text-sm text-ink">{item.layer}</p>
            <p className="mt-1 break-words text-sm text-muted">{item.detail}</p>
          </li>
        ))}
      </ul>

      {/* Наблюдения модели. Отбиты и подписаны как подсказка, а не вывод:
          иначе на них будут ссылаться как на заключение экспертизы. */}
      {data.observationsAsked ? (
        <div className="mt-8 border border-line p-5">
          <h3 className="eyebrow">{words.observationsTitle}</h3>
          <p className="mt-2 max-w-prose text-sm text-muted">
            {words.observationsNote}
          </p>

          {data.observations.length > 0 ? (
            <ul className="mt-4">
              {data.observations.map((item, index) => (
                <li key={index} className="mt-2 text-sm">
                  <span className="text-ink">{item.where}</span>
                  <span className="text-muted"> — {item.what}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">{words.observationsNone}</p>
          )}
        </div>
      ) : null}

      {detectors.length > 0 ? (
        <div className="mt-8">
          <h3 className="eyebrow">{words.detectorsTitle}</h3>

          <div className="mt-4 grid gap-px bg-line">
            {detectors.map((item) => (
              <ServiceCard
                key={item.service}
                words={words}
                name={detectorById(item.service)?.name ?? item.service}
                score={item.score}
                generator={item.generator}
              />
            ))}
          </div>

          {/*
            Оговорка выбирается по нашему же разбору, а не пишется одна на
            все случаи. Метаданные уцелели — файл не проходил через соцсеть,
            и числу можно доверять больше; стёрты — перед нами скриншот, а
            на скриншотах эти сервисы и ошибаются.
          */}
          <p className="mt-4 max-w-prose text-sm text-muted">
            {found(data.origin)
              ? words.detectorsNoteClean
              : words.detectorsNoteStripped}
          </p>

          {/*
            Прямое расхождение со свидетельством. Молчать о нём нельзя:
            человек видит два ответа рядом и вправе знать, какому верить.
          */}
          {disagrees(data, detectors) ? (
            <p className="mt-3 max-w-prose border-l-2 border-signal pl-4 text-sm text-muted">
              {words.detectorsDisagree}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 flex items-start gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {words.notStored}
      </p>
    </section>
  );
}

/*
  Ответ одного сервиса: слово, число и полоса.

  Слово говорит, что это значит, число — насколько сервис уверен. Порознь
  они хуже: одно слово скрывает разницу между 0.51 и 0.99, одно число
  ничего не значит человеку, который не знает шкалы.

  Полоса нужна ровно для того, чтобы разницу было видно не читая. Цвет у
  неё один на все значения — тёмный. Красить высокие оценки тревожным
  цветом было бы обвинением: сгенерированное изображение само по себе не
  нарушение, а страницу открывают и просто из любопытства.
*/
function ServiceCard({
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
    <div className="bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-lg">{said(words, score)}</p>
        <p className="font-mono text-sm text-muted">{name}</p>
      </div>

      <p className="mt-4 text-sm text-muted">{words.detectorScale}</p>

      <div className="mt-2 flex items-center gap-3">
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
        <span className="w-12 text-right font-mono text-sm tabular-nums">
          {percent}%
        </span>
      </div>

      {generator ? (
        <p className="mt-3 text-sm text-muted">
          {words.detectorGenerator} {generator}
        </p>
      ) : null}
    </div>
  );
}

/** Ответ словом. Число рядом — в карточке. */
function said(words: Dictionary["checkPage"], score: number): string {
  if (score >= 0.9) return words.detectorSure;
  if (score >= 0.5) return words.detectorLikely;
  if (score >= 0.1) return words.detectorUnlikely;
  return words.detectorNo;
}

/**
 * Спорит ли сервис с тем, что записано в файле.
 *
 * Спор только в одну сторону считаем спором: файл говорит «снято камерой»
 * или «подписано как съёмка», а сервис — «сгенерировано». Обратный случай
 * (в файле след генератора, сервис молчит) спором не является: сервис
 * метаданных не читает и знать про них не может.
 */
function disagrees(data: ProvenanceResult, detectors: DetectorScore[]): boolean {
  const saysCamera = data.origin === "camera" || data.origin === "screen";
  return saysCamera && detectors.some((item) => item.score >= 0.5);
}
