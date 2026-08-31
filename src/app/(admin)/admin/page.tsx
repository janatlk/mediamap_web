import Link from "next/link";

import Attachments from "@/components/report/Attachments";
import { REPORT_STATUS } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { STAFF_LANG, VIOLATION_SLUGS, getDictionary, violationText } from "@/lib/i18n";
import { approveReport, rejectReport, reopenReport } from "@/server/moderation-actions";
import { loadReports, type Filter, type ReportRow } from "@/server/reports-data";

export const metadata = { title: "Сообщения" };
export const dynamic = "force-dynamic";

/*
  Сообщения и решения по ним.

  Раньше здесь была только очередь непроверенного, и всё решённое исчезало из
  панели навсегда. Теперь фильтр: видно и то, что ждёт, и то, что уже разобрали,
  с возможностью вернуть решение назад.
*/

const dict = getDictionary(STAFF_LANG);
const typeName = (slug: string) => violationText(dict, slug)?.name ?? slug;

const TABS: { value: Filter["status"]; label: string }[] = [
  { value: REPORT_STATUS.PENDING, label: "Ждут проверки" },
  { value: REPORT_STATUS.APPROVED, label: "Подтверждены" },
  { value: REPORT_STATUS.REJECTED, label: "Отклонены" },
  { value: "ALL", label: "Все" },
];

const STATUS_NAME: Record<string, string> = {
  PENDING: "ждёт",
  APPROVED: "подтверждено",
  REJECTED: "отклонено",
};

const FACT_NAME: Record<string, string> = {
  false: "опровергается источниками",
  true: "подтверждается источниками",
  unverified: "источников не нашлось",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireStaff();

  const params = await searchParams;
  const filter: Filter = {
    status: asStatus(params.status),
    query: params.q ?? "",
    page: Number(params.page) || 1,
  };
  const data = await loadReports(filter);

  return (
    <div className="panel">
      <h1>Сообщения</h1>
      <p className="lead">
        Решение принимает человек. Оценка ИИ только задаёт порядок в очереди —
        сверху то, что больше похоже на настоящее нарушение.
      </p>

      <Filters filter={filter} counts={data.counts} />

      {data.rows.length === 0 ? (
        <p className="empty">Ничего не найдено.</p>
      ) : (
        data.rows.map((row) => <Report key={row.id} row={row} />)
      )}

      <Pager filter={filter} page={data.page} pages={data.pages} total={data.total} />
    </div>
  );
}

function asStatus(raw: string | undefined): Filter["status"] {
  const allowed = [...Object.values(REPORT_STATUS), "ALL"];
  return allowed.includes(raw as string) ? (raw as Filter["status"]) : REPORT_STATUS.PENDING;
}

function Filters({ filter, counts }: { filter: Filter; counts: Record<string, number> }) {
  return (
    <>
      {/* Открытая вкладка — не ссылка: переход, которого не будет. Раньше
          все четыре выглядели одинаково, и различить открытую можно было
          только по жирности среди четырёх синих подчёркиваний подряд. */}
      <nav className="tabs">
        {TABS.map((tab) =>
          tab.value === filter.status ? (
            <b key={tab.value} aria-current="page">
              {tab.label} ({counts[tab.value] ?? 0})
            </b>
          ) : (
            <Link key={tab.value} href={link({ ...filter, status: tab.value, page: 1 })}>
              {tab.label} ({counts[tab.value] ?? 0})
            </Link>
          ),
        )}
      </nav>

      {/* Поиск обычной формой на GET: адрес остаётся ссылкой, которой можно
          поделиться с коллегой. */}
      <form className="search" action="/admin" method="get">
        <input type="hidden" name="status" value={filter.status} />
        <input
          type="search"
          name="q"
          size={30}
          defaultValue={filter.query}
          placeholder="Номер, текст, город"
          aria-label="Поиск по сообщениям"
        />{" "}
        <button type="submit">Найти</button>
      </form>
    </>
  );
}

function Report({ row }: { row: ReportRow }) {
  const decided = row.status !== REPORT_STATUS.PENDING;

  return (
    <article className={decided ? "decided" : undefined}>
      <header>
        <span className={`badge ${row.status.toLowerCase()}`}>
          {STATUS_NAME[row.status] ?? row.status}
        </span>{" "}
        {row.headline ?? typeName(row.typeSlug)}
        {row.headline ? ` · ${typeName(row.typeSlug)}` : ""}
        <br />
        <span className="id">
          {row.publicId}, {formatDate(row.createdAt, STAFF_LANG)}
        </span>
        {" · "}
        <Assessment row={row} />
        {/* Ссылки на само нарушение. В списке по двадцать пять карточек, и без
            них нельзя было ни открыть дело отдельно, ни переслать коллеге, ни
            посмотреть, что по этому сообщению видит заявитель. */}
        {row.receiptToken ? (
          <>
            {" · "}
            <a
              href={`/${STAFF_LANG}/report/sent/${row.receiptToken}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              как видит заявитель
            </a>
          </>
        ) : null}
        {row.status === REPORT_STATUS.APPROVED ? (
          <>
            {" · "}
            <a
              href={`/${STAFF_LANG}/cases/${row.publicId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              опубликованный случай
            </a>
          </>
        ) : null}
      </header>

      <div>
        <p>{row.story}</p>

        {/* Приложенное — то, ради чего проверку вообще можно провести:
            публикацию к этому времени часто уже удалили. */}
        <Attachments items={row.attachments} title="Приложено" />

        <Reasoning row={row} />

        <p className="note">
          {row.link ? (
            <a href={row.link} target="_blank" rel="noopener noreferrer nofollow">
              {row.source ?? row.link}
            </a>
          ) : (
            "ссылки нет"
          )}
          {row.city ? ` · ${row.city}` : ""}
        </p>
      </div>

      {/*
        У рассмотренного форма спрятана. На вкладке «Подтверждены» их
        шестьдесят с лишним, и каждое разворачивало пять полей и три кнопки:
        экран был занят правкой того, что править никто не собирался.
        Решение уже принято, и по умолчанию его надо читать, а не
        переписывать.
      */}
      {decided ? (
        <details>
          <summary>Изменить решение</summary>
          <Decide row={row} />
        </details>
      ) : (
        <Decide row={row} />
      )}
    </article>
  );
}

function Assessment({ row }: { row: ReportRow }) {
  // Правка человека показывается вместо оценки модели, но с пометкой чья
  // она: иначе через месяц не отличить, что решила модель, а что сотрудник.
  const edited = row.reviewVerdict !== null || row.reviewConfidence !== null;
  const finalVerdict = row.reviewVerdict ?? row.aiVerdict;
  const finalConfidence = row.reviewConfidence ?? row.aiConfidence;

  if (!finalVerdict || finalConfidence === null) {
    return <span className="note">оценки нет</span>;
  }

  const percent = Math.round(finalConfidence * 100);
  const agrees = finalVerdict === row.typeSlug;
  const verdict = finalVerdict === "unclear" ? "вид не определён" : typeName(finalVerdict);

  return (
    <span className="note">
      {edited ? "правка проверяющего" : "ИИ"}: {verdict}, {percent}%
      {/* Расхождение с выбором заявителя — главное, ради чего оценка нужна
          проверяющему: значит вид, скорее всего, надо поменять. */}
      {!agrees && finalVerdict !== "unclear" ? " · заявитель выбрал другой вид" : ""}
      {edited ? "" : chosenNote(row, finalVerdict)}
      {row.aiSource === "rules" && !edited ? " · по словарю, не моделью" : ""}
    </span>
  );
}

/**
 * Ответ по тому виду, о котором заявил человек.
 *
 * Общий вердикт отвечает на вопрос «что модель нашла», а заявитель спрашивал
 * другое: «то, о чём я написал, — это оно?». Числа у этих вопросов разные, и
 * без второго выходило, что на заявку о мошенничестве панель показывала 99%
 * уверенности в том, что перед нами не язык вражды.
 *
 * Число здесь — вероятность нарушения заявленного вида, а не уверенность
 * модели в своём ответе. Молчим только когда сказать нечего: этот вид не
 * проверяли или он и есть общий вердикт, уже показанный выше.
 */
function chosenNote(row: ReportRow, finalVerdict: string | null): string {
  const check = row.checks?.[row.typeSlug];
  if (!check || finalVerdict === row.typeSlug) return "";

  return ` · ${typeName(row.typeSlug)}: ${Math.round(check.confidence * 100)}%`;
}

/** Разбор целиком: почему так решено, что проверить и чем кончилась проверка. */
function Reasoning({ row }: { row: ReportRow }) {
  const summary = readable(row.aiSummary);
  // Разбор по заявленному виду. Идёт первым и подписан: это ответ на вопрос
  // заявителя, а summary — ответ той головы, которая отработала первой.
  const chosen = readable(row.checks?.[row.typeSlug]?.explanation ?? null);
  if (!summary && !chosen && !row.claim && !row.aiExtractedText) return null;

  return (
    <details>
      <summary>Разбор ИИ</summary>

      {/* Что модель списала со снимка. Идёт первым: когда картинка есть,
          вердикт вынесен по этому тексту, а не по словам заявителя, и
          сверять надо в первую очередь его. */}
      {row.aiExtractedText ? (
        <p>
          <i>Со снимка прочитано:</i> «{row.aiExtractedText}»
        </p>
      ) : null}

      {chosen ? (
        <p>
          <i>{typeName(row.typeSlug)}:</i> {chosen}
        </p>
      ) : null}

      {summary && summary !== chosen ? <p>{summary}</p> : null}

      {row.claim ? (
        <p>
          Проверить утверждение: «{row.claim}»
          {row.factVerdict ? ` — ${FACT_NAME[row.factVerdict] ?? row.factVerdict}` : ""}
        </p>
      ) : null}

      {row.sources.length ? (
        <ul>
          {row.sources.map((source) => (
            <li key={source}>
              <a href={source} target="_blank" rel="noopener noreferrer nofollow">
                {hostOf(source)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Ссылку модель способна выдумать. Открыть и посмотреть — обязательно. */}
      {row.sources.length ? (
        <p className="note">Источники подобрала модель — откройте их, прежде чем опираться.</p>
      ) : null}
    </details>
  );
}

/*
  Решение по сообщению — и его правка.

  Форма одна на оба состояния. Раньше их было две: у нерассмотренного —
  поля, у рассмотренного — только «вернуть в очередь». Выходило, что
  исправить собственную опечатку в заголовке или заметке можно было, лишь
  отправив дело обратно в очередь, а вердикт и уверенность не правились
  вовсе — они так и оставались тем, что выдала модель.

  Все поля показывают текущее значение, а не пустоту: сохранение перезаписывает
  их целиком, и пустое поле «заметка» стёрло бы написанное в прошлый раз.
*/
function Decide({ row }: { row: ReportRow }) {
  const decided = row.status !== REPORT_STATUS.PENDING;

  // Что стоит сейчас — чтобы сказать это словами в пустом пункте списка.
  // «как решил ИИ» не отвечало на вопрос «а как он решил»: чтобы узнать,
  // приходилось поднимать глаза в шапку карточки.
  const aiName =
    row.aiVerdict === null
      ? "оценки нет"
      : row.aiVerdict === "unclear"
        ? "вид не определён"
        : typeName(row.aiVerdict);

  return (
    <footer>
      <form>
        <input type="hidden" name="id" value={row.id} />

        <p className="note">Пустое поле — остаётся то, что решил ИИ.</p>

        <p>
          <label htmlFor={`headline-${row.id}`}>Заголовок случая</label>
          <br />
          <input
            id={`headline-${row.id}`}
            type="text"
            name="headline"
            size={60}
            defaultValue={row.headline ?? ""}
            placeholder="Коротко: что произошло"
          />
        </p>

        <p>
          <label htmlFor={`verdict-${row.id}`}>Вердикт</label>{" "}
          <select
            id={`verdict-${row.id}`}
            name="verdict"
            defaultValue={row.reviewVerdict ?? ""}
          >
            {/* Пустой пункт — не «ничего», а «оставить как решила модель».
                Без него правка вердикта стала бы обязательной на каждом
                сообщении, включая те, где с моделью и так согласны. */}
            <option value="">оставить: {aiName}</option>
            <option value="unclear">вид не определён</option>
            {VIOLATION_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {typeName(slug)}
              </option>
            ))}
          </select>{" "}
          <label htmlFor={`confidence-${row.id}`}>Уверенность</label>{" "}
          <input
            id={`confidence-${row.id}`}
            type="number"
            name="confidence"
            min={0}
            max={100}
            step={1}
            size={4}
            // == null ловит и null, и undefined: у старых записей поля
            // может не быть вовсе, и тогда в атрибут уезжал NaN.
            defaultValue={
              row.reviewConfidence == null
                ? ""
                : Math.round(row.reviewConfidence * 100)
            }
            placeholder={
              row.aiConfidence == null
                ? "—"
                : String(Math.round(row.aiConfidence * 100))
            }
          />
          %
        </p>

        <p>
          <label htmlFor={`summary-${row.id}`}>Пояснение для заявителя</label>
          <br />
          {/* Текст модели можно переписать целиком: его читает заявитель, а
              модель формулирует то коряво, то мимо сути. Пусто — остаётся
              её вариант. */}
          <textarea
            id={`summary-${row.id}`}
            name="summary"
            rows={3}
            cols={70}
            defaultValue={row.reviewSummary ?? ""}
            placeholder={readable(row.aiSummary) || "Пусто — заявитель прочитает разбор ИИ"}
          />
        </p>

        <p>
          <label htmlFor={`note-${row.id}`}>Заметка к решению</label>
          <br />
          <input
            id={`note-${row.id}`}
            type="text"
            name="note"
            size={70}
            defaultValue={row.moderatorComment ?? ""}
            placeholder="Видна заявителю, необязательно"
          />
        </p>

        {/*
          Три кнопки в ряд, одинаковые с виду, — и любая из них решала судьбу
          сообщения. Теперь видно, какая главная: подтверждение выделено,
          отказ стоит рядом обычной кнопкой, а возврат в очередь отбит вправо
          — он не про решение, а про откат.
        */}
        <p className="actions">
          <button type="submit" className="primary" formAction={approveReport}>
            {decided ? "Сохранить как подтверждённое" : "Подтвердить"}
          </button>
          <button type="submit" formAction={rejectReport}>
            {decided ? "Сохранить как отклонённое" : "Отклонить"}
          </button>
        </p>

        {/* Отдельной строкой, а не третьей кнопкой в ряду: возврат правки в
            полях не сохраняет — он про статус. Стоял рядом с решениями, и
            нажимался вместо «Сохранить». */}
        {decided ? (
          <p className="undo">
            <button type="submit" formAction={reopenReport}>
              Вернуть в очередь
            </button>{" "}
            <span className="note">правки в полях не сохранятся</span>
          </p>
        ) : null}

        {decided ? (
          <p className="note">
            {STATUS_NAME[row.status]}
            {row.reviewedAt ? ` ${formatDate(row.reviewedAt, STAFF_LANG)}` : ""}
            {row.reviewedBy ? `, ${row.reviewedBy}` : ""}
          </p>
        ) : null}
      </form>
    </footer>
  );
}

function Pager({ filter, page, pages, total }: {
  filter: Filter;
  page: number;
  pages: number;
  total: number;
}) {
  return (
    <p className="note">
      Всего {total}
      {pages > 1 ? `, страница ${page} из ${pages}` : ""}
      {page > 1 ? <> · <Link href={link({ ...filter, page: page - 1 })}>назад</Link></> : null}
      {page < pages ? <> · <Link href={link({ ...filter, page: page + 1 })}>дальше</Link></> : null}
    </p>
  );
}

function link(filter: Filter): string {
  const params = new URLSearchParams({ status: String(filter.status) });
  if (filter.query) params.set("q", filter.query);
  if (filter.page > 1) params.set("page", String(filter.page));
  return `/admin?${params}`;
}

/**
 * У записей, снятых разбором по словам, в aiSummary лежит не текст, а перечень
 * кодов: «markersFound,matchesChoice,noLink,brief». Человеку он ничего не
 * говорит. Показываем только то, что действительно написано словами.
 */
function readable(summary: string | null): string | null {
  const text = (summary ?? "").trim();
  return text && text.includes(" ") ? text : null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
