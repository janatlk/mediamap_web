"use client";

import { useActionState } from "react";

import type { DetectorInfo } from "@/lib/detectors";
import {
  forgetDetectorKey,
  saveDetectorKey,
  testDetectorKey,
  toggleDetector,
  type ActionState,
} from "@/server/detector-actions";

/*
  Один сервис: поля ключа, сохранение и живая проверка.

  Клиентский компонент только ради ответа. Ключ легко вписать с опечаткой
  или скопировать с лишним пробелом, и человеку надо сказать, что именно
  сервис ответил, — а не молча перерисовать страницу.

  Заведённый ключ обратно не показываем никогда, только его хвост:
  показанное однажды попадает в снимок экрана и в чужие глаза за плечом.
*/

type Props = {
  info: DetectorInfo;
  /** Заведён ли ключ и что было при последней проверке. */
  state: {
    saved: boolean;
    broken: boolean;
    enabled: boolean;
    lastStatus: string | null;
    lastError: string | null;
    lastLatencyMs: number | null;
    lastCheckedAt: string | null;
  } | null;
};

export default function DetectorCard({ info, state }: Props) {
  const [saveState, save, saving] = useActionState<ActionState, FormData>(
    saveDetectorKey,
    {},
  );
  const [testState, test, testing] = useActionState<ActionState, FormData>(
    testDetectorKey,
    {},
  );

  return (
    <article>
      <header>
        <b>{info.name}</b> · {info.jurisdiction}
        {info.video ? " · умеет видео" : " · только изображения"}
      </header>

      <p className="note">{info.note}</p>
      <p className="note">
        Бесплатно: {info.free}. Дальше: {info.price}.
      </p>
      <p className="note">
        <a href={info.console} target="_blank" rel="noopener noreferrer">
          Получить ключ
        </a>
        {" · "}
        <a href={info.docs} target="_blank" rel="noopener noreferrer">
          Документация
        </a>
      </p>

      {state ? (
        <p>
          <span className="status">
            {state.broken
              ? "ключ не расшифровывается"
              : state.enabled
                ? "заведён"
                : "заведён, выключен"}
          </span>
          {state.lastStatus ? (
            <>
              {" · последняя проверка: "}
              {state.lastStatus === "ok"
                ? `отвечает, ${state.lastLatencyMs} мс`
                : `ошибка — ${state.lastError}`}
              {state.lastCheckedAt ? ` (${state.lastCheckedAt})` : ""}
            </>
          ) : (
            " · ещё не проверяли"
          )}
        </p>
      ) : (
        <p className="note">Ключ не заведён.</p>
      )}

      {state?.broken ? (
        <p className="warn">
          Запись зашифрована другим SECRETS_KEY. Впишите ключ заново — прочесть
          старую запись нельзя даже нам, в этом и смысл.
        </p>
      ) : null}

      <form action={save}>
        <input type="hidden" name="service" value={info.id} />
        {info.fields.map((field) => (
          <label key={field.name}>
            {field.label}:
            <br />
            <input
              name={field.name}
              type="password"
              size={50}
              autoComplete="off"
              placeholder={state ? "оставить прежний нельзя — впишите заново" : ""}
              required
            />
            {field.hint ? (
              <>
                <br />
                <span className="note">{field.hint}</span>
              </>
            ) : null}
          </label>
        ))}

        <p>
          <button type="submit" disabled={saving}>
            {saving ? "Сохраняю и проверяю…" : "Сохранить и проверить"}
          </button>
        </p>
      </form>

      {saveState.error ? <p className="warn">{saveState.error}</p> : null}
      {saveState.done ? <p className="note">{saveState.done}</p> : null}

      {state && !state.broken ? (
        <form action={test}>
          <input type="hidden" name="service" value={info.id} />
          <p>
            <button type="submit" disabled={testing}>
              {testing ? "Спрашиваю…" : "Проверить ключ"}
            </button>{" "}
            <span className="note">
              Настоящий запрос картинкой в один пиксель — стоит одну операцию.
            </span>
          </p>
        </form>
      ) : null}

      {testState.error ? <p className="warn">{testState.error}</p> : null}
      {testState.done ? <p className="note">{testState.done}</p> : null}

      {/* Выключение и удаление — обычные формы без своего ответа: тут не
          о чем рассказывать, результат виден по самой строке. */}
      {state ? (
        <form>
          <input type="hidden" name="service" value={info.id} />
          <input type="hidden" name="enabled" value={state.enabled ? "0" : "1"} />
          <p>
            <button type="submit" formAction={toggleDetector}>
              {state.enabled ? "Выключить" : "Включить"}
            </button>{" "}
            <button type="submit" formAction={forgetDetectorKey}>
              Забыть ключ
            </button>{" "}
            <span className="note">
              Выключенный сервис остаётся заведённым, но в сравнении не
              участвует.
            </span>
          </p>
        </form>
      ) : null}
    </article>
  );
}
