"use client";

import { useActionState } from "react";

import { detectorById } from "@/lib/detectors";
import { compareDetectors, type CompareState } from "@/server/detector-actions";

/*
  Прогон одной картинки через все включённые сервисы разом.

  Ради этого страница и заводится. Цифры из чужих бенчмарков к нашему
  потоку отношения не имеют: там меряют на нетронутых файлах, а к нам
  приходят скриншоты из соцсетей. Один и тот же файл, поданный трём
  сервисам, показывает и расхождение между ними, и цену вопроса.

  Смотреть надо прежде всего на настоящих фотографиях: ложное срабатывание
  для нас хуже пропуска. Назвать подлинный снимок подделкой значит помочь
  тому, кто хочет от него отмахнуться.
*/

/** Оценка словами. Проценты здесь были бы обманом точности. */
function said(score: number | null): string {
  if (score === null) return "числа в ответе нет";
  if (score >= 0.9) return `уверенно «сгенерировано» (${score.toFixed(2)})`;
  if (score >= 0.5) return `скорее «сгенерировано» (${score.toFixed(2)})`;
  if (score >= 0.1) return `скорее «снято» (${score.toFixed(2)})`;
  return `уверенно «снято» (${score.toFixed(2)})`;
}

export default function DetectorCompare() {
  const [state, run, pending] = useActionState<CompareState, FormData>(
    compareDetectors,
    {},
  );

  return (
    <section>
      <form action={run}>
        <label>
          Изображение:
          <br />
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
          />
        </label>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Спрашиваю все сервисы…" : "Прогнать через все"}
          </button>{" "}
          <span className="note">
            Файл уходит к сторонним поставщикам — во Францию и США. Кладите то,
            что не жалко им показать.
          </span>
        </p>
      </form>

      {state.error ? <p className="warn">{state.error}</p> : null}

      {state.results ? (
        <>
          <p className="note">Файл: {state.fileName}</p>
          <table>
            <thead>
              <tr>
                <th>Сервис</th>
                <th>Что сказал</th>
                <th>Генератор</th>
                <th className="num">Время</th>
              </tr>
            </thead>
            <tbody>
              {state.results.map((item) => (
                <tr key={item.service}>
                  <td>{detectorById(item.service)?.name ?? item.service}</td>
                  <td>
                    {item.ok ? said(item.score) : <span className="status">{item.error}</span>}
                  </td>
                  <td>{item.generator ?? "—"}</td>
                  <td className="num">{item.latencyMs} мс</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Сырые ответы. Пока мы решаем, верить ли этим сервисам, только по
              ним и видно, что они на самом деле сказали и не потерял ли наш
              переходник половину смысла. */}
          {state.results.map((item) =>
            item.raw ? (
              <details key={`raw-${item.service}`}>
                <summary>
                  {detectorById(item.service)?.name ?? item.service}: ответ целиком
                </summary>
                <pre>{JSON.stringify(item.raw, null, 2).slice(0, 4000)}</pre>
              </details>
            ) : null,
          )}
        </>
      ) : null}
    </section>
  );
}
