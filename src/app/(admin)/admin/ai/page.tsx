import Link from "next/link";

import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { DEFAULT_LANG } from "@/lib/i18n";
import {
  loadAnalytics,
  type Analytics,
  type Bucket,
  type Calibration,
} from "@/server/analytics-data";
import { mlEnabled, mlServiceUrl } from "@/server/ml-service";

export const metadata = { title: "Контроль ИИ" };
export const dynamic = "force-dynamic";

/*
  Страница отвечает на один вопрос: можно ли верить предварительной оценке.

  Поэтому наверх вынесены не красивые числа, а неудобные — отказы сервиса и
  расхождения с решением проверяющего. Общее количество разборов ничего не
  говорит о качестве, и в шапке ему не место.
*/

const PERIODS = [7, 30, 90];

/** Сколько рассмотренных нужно, чтобы доля вообще что-то значила. */
const ENOUGH = 20;

const VERDICT_NAMES: Record<string, string> = {
  "hate-speech": "язык вражды",
  disinformation: "дезинформация",
  "digital-fraud": "цифровое мошенничество",
  unclear: "вид не определён",
};

const FACT_NAMES: Record<string, string> = {
  true: "подтвердилось",
  false: "опровергнуто источниками",
  unverified: "источников не нашлось",
};

const ACT_NAMES: Record<string, string> = {
  insult: "оскорбление",
  discrimination: "дискриминация",
  incitement: "призыв к расправе",
};

export default async function AiControlPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireStaff();

  const days = period((await searchParams).days);
  const data = await loadAnalytics(days);

  return (
    <div className="panel">
      <h1>Контроль ИИ</h1>
      <p className="lead">
        Оценка ничего не решает — статус ставит человек. Здесь видно, насколько
        ей вообще стоит доверять.
      </p>

      <p>
        Период:{" "}
        {PERIODS.map((value, index) => (
          <span key={value}>
            {index > 0 ? " | " : ""}
            {value === days ? (
              <b>{value} дней</b>
            ) : (
              <Link href={`/admin/ai?days=${value}`}>{value} дней</Link>
            )}
          </span>
        ))}
      </p>

      <ServiceState />

      {data.totals.checks === 0 ? (
        <p className="empty">
          За {days} дней ни одной оценки не снималось. Строки появляются при
          подаче сообщений через форму.
        </p>
      ) : (
        <>
          <Health data={data} />
          <AgreementBlock data={data} />
          <CalibrationBlock rows={data.calibration} />
          <Distributions data={data} />
          <FactBlock data={data} />
          <Daily data={data} />
          <Failures data={data} />
        </>
      )}
    </div>
  );
}

function period(raw: string | undefined): number {
  const value = Number(raw);
  return PERIODS.includes(value) ? value : 30;
}

/** Поднят ли ML-сервис прямо сейчас. Без него оценку снимает словарь. */
async function ServiceState() {
  if (!mlEnabled()) {
    return (
      <p className="warn">
        ML-сервис не подключён: в <code>ML_SERVICE_URL</code> пусто. Оценку
        снимает разбор по ключевым словам — он груб, и потолок у него 80%.
      </p>
    );
  }

  const state = await ping();
  if (!state) {
    return (
      <p className="warn">
        ML-сервис по адресу <code>{mlServiceUrl()}</code> не отвечает. Новые
        сообщения оцениваются словарём, пока он не поднимется.
      </p>
    );
  }

  return (
    <p className="empty">
      Сервис отвечает. Модели: <code>{state.model}</code>. Поиск:{" "}
      <code>{state.search}</code>.
      {state.cache ? ` Память: ${state.cache}.` : ""}
    </p>
  );
}

type State = { model: string; search: string; cache: string | null };

/** Короткий запрос к /health. Ошибку не показываем — важен сам факт. */
async function ping(): Promise<State | null> {
  try {
    const response = await fetch(`${mlServiceUrl()}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      model_version?: string;
      search_provider?: string;
      claim_cache?: { items: number; hit_rate: number } | null;
    };

    return {
      model: body.model_version ?? "без версии",
      search: body.search_provider ?? "нет",
      cache: body.claim_cache
        ? `${body.claim_cache.items} утверждений, попаданий ${Math.round(
            body.claim_cache.hit_rate * 100,
          )}%`
        : null,
    };
  } catch {
    return null;
  }
}

type Line = { label: string; value: string; hint?: string };

/** Сводка цифрами — такой же таблицей, как всё остальное на странице. */
function Stats({ lines }: { lines: Line[] }) {
  return (
    <table>
      <tbody>
        {lines.map((line) => (
          <tr key={line.label}>
            <td>{line.label}</td>
            <td className="num">{line.value}</td>
            <td className="note">{line.hint ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Health({ data }: { data: Analytics }) {
  const { totals, latency } = data;

  return (
    <>
      <h2>Как работает сервис</h2>
      <p className="lead">
        Отказ — это когда сервис не ответил вовремя. Такое сообщение всё равно
        принято, просто оценку ему дал словарь.
      </p>
      <Stats
        lines={[
          { label: "Оценок снято", value: String(totals.checks) },
          {
            label: "Разобрано моделью",
            value: String(totals.byModel),
            hint: `словарём — ${totals.byRules}`,
          },
          {
            label: "Отказов сервиса",
            value: `${Math.round(totals.failureRate * 100)}%`,
            hint: `${totals.failures} из ${totals.byModel + totals.failures} обращений`,
          },
          {
            label: "Задержка, медиана",
            value: seconds(latency.median),
            hint: `95% укладываются в ${seconds(latency.p95)}, худший ${seconds(latency.max)}`,
          },
        ]}
      />
    </>
  );
}

function AgreementBlock({ data }: { data: Analytics }) {
  const { reviewed, matched, missed, falseAlarms } = data.agreement;

  if (reviewed === 0) {
    return (
      <>
        <h2>Совпадение с проверяющим</h2>
        <p className="empty">
          Сравнивать пока не с чем: ни одно из оценённых сообщений ещё не
          рассмотрено. Цифра появится, когда очередь начнёт разбираться.
        </p>
      </>
    );
  }

  return (
    <>
      <h2>Совпадение с проверяющим</h2>
      <p className="lead">
        {reviewed < ENOUGH
          ? `Рассмотрено всего ${reviewed} — по такому числу выводы делать рано, цифры показаны для наблюдения.`
          : "Единственная честная проверка качества: человек посмотрел сообщение и оставил вид или сменил его."}
      </p>
      <Stats
        lines={[
          { label: "Рассмотрено с оценкой", value: String(reviewed) },
          {
            label: "Вид угадан",
            value: share(matched, reviewed),
            hint: `${matched} из ${reviewed}`,
          },
          {
            label: "Пропущено",
            value: share(missed, reviewed),
            hint: "сказал «непонятно», а нарушение подтвердили",
          },
          {
            label: "Ложных тревог",
            value: share(falseAlarms, reviewed),
            hint: "назвал вид, а сообщение отклонили",
          },
        ]}
      />
    </>
  );
}

function CalibrationBlock({ rows }: { rows: Calibration[] }) {
  const filled = rows.filter((row) => row.checks > 0);
  if (!filled.length) return null;

  return (
    <>
      <h2>Оправдана ли уверенность</h2>
      <p className="lead">
        Если модель честна с собой, доля подтверждённых растёт сверху вниз.
        Ровная колонка означает, что проценту верить нельзя.
      </p>
      <table>
        <thead>
          <tr>
            <th>Уверенность</th>
            <th className="num">Оценок</th>
            <th className="num">Из них подтвердили</th>
          </tr>
        </thead>
        <tbody>
          {filled.map((row) => (
            <tr key={row.range}>
              <td>{row.range}</td>
              <td className="num">{row.checks}</td>
              <td className="num">
                {row.rate === null ? "—" : `${Math.round(row.rate * 100)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Distributions({ data }: { data: Analytics }) {
  return (
    <>
      <h2>Что находит</h2>
      <p className="lead">Перекос в одну сторону — повод посмотреть на промпт, а не радоваться.</p>
      <Counts title="Вид нарушения" rows={data.verdicts} names={VERDICT_NAMES} />
      <Counts title="Направление" rows={data.sublabels} />
      <Counts title="Характер высказывания" rows={data.acts} names={ACT_NAMES} />
      {data.models.length > 1 ? <Counts title="Версии модели" rows={data.models} /> : null}
    </>
  );
}

function Counts({ title, rows, names }: {
  title: string;
  rows: Bucket[];
  names?: Record<string, string>;
}) {
  if (!rows.length) return null;
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <table>
      <thead>
        <tr>
          <th>{title}</th>
          <th className="num">Сколько</th>
          <th className="num">Доля</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{names?.[row.label] ?? row.label}</td>
            <td className="num">{row.count}</td>
            <td className="num">{share(row.count, total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FactBlock({ data }: { data: Analytics }) {
  const { withClaim, byVerdict, withSources } = data.factChecks;
  if (!withClaim) return null;

  return (
    <>
      <h2>Проверка утверждений по источникам</h2>
      <p className="lead">
        Запускается только там, где модель нашла проверяемое утверждение.
        «Источников не нашлось» — нормальный исход, а не сбой.
      </p>
      <Stats
        lines={[
          { label: "Утверждений выделено", value: String(withClaim) },
          { label: "Со ссылками на источники", value: String(withSources) },
        ]}
      />
      <Counts title="Итог проверки" rows={byVerdict} names={FACT_NAMES} />
    </>
  );
}

function Daily({ data }: { data: Analytics }) {
  if (data.daily.length < 2) return null;

  return (
    <>
      <h2>По дням</h2>
      <table>
        <thead>
          <tr>
            <th>День</th>
            <th className="num">Оценок</th>
            <th className="num">Сбоев</th>
          </tr>
        </thead>
        <tbody>
          {data.daily.map((day) => (
            <tr key={day.day}>
              <td>{day.day}</td>
              <td className="num">{day.checks}</td>
              <td className="num">{day.failures || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Failures({ data }: { data: Analytics }) {
  if (!data.failures.length) return null;

  return (
    <>
      <h2>Последние отказы</h2>
      <p className="lead">Здесь видно, чем именно сервис отвечал вместо оценки.</p>
      <table>
        <thead>
          <tr>
            <th>Когда</th>
            <th>Что ответил</th>
          </tr>
        </thead>
        <tbody>
          {data.failures.map((failure) => (
            <tr key={failure.id}>
              <td>
                {formatDate(failure.createdAt, DEFAULT_LANG)}
                {failure.latencyMs ? ` · ${seconds(failure.latencyMs)}` : ""}
              </td>
              <td>{failure.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function share(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)}%` : "—";
}

function seconds(ms: number): string {
  if (!ms) return "—";
  return ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`;
}
