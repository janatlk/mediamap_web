import Link from "next/link";
import { notFound } from "next/navigation";

import { NEEDS_REASON, SOURCE_STATUS } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { DEFAULT_LANG } from "@/lib/i18n";
import { PLATFORM_NAME, type Platform } from "@/lib/platforms";
import { addSourceHandle, mergeSources, setSourceStatus } from "@/server/source-actions";
import { loadSource } from "@/server/sources-data";
import { STATUS_NAME } from "../page";

export const metadata = { title: "Источник" };
export const dynamic = "force-dynamic";

/*
  Карточка источника: история имён, сообщения и оценка.

  История стоит выше оценки намеренно. Оценку ставят, посмотрев на то, что
  за источником записано, а не наоборот, и порядок на странице должен этому
  соответствовать.
*/

const REPORT_STATUS_NAME: Record<string, string> = {
  PENDING: "ждёт",
  APPROVED: "подтверждено",
  REJECTED: "отклонено",
};

export default async function SourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();

  const { id } = await params;
  const source = await loadSource(Number(id));
  if (!source) notFound();

  const renamed = source.handles.filter((handle) => handle.kind === "HANDLE");

  return (
    <div className="panel">
      <p>
        <Link href="/admin/sources">← Все источники</Link>
      </p>

      <h1>{source.handle ? `@${source.handle}` : source.host}</h1>
      <p className="lead">
        {PLATFORM_NAME[source.platform as Platform] ?? source.platform} ·{" "}
        {source.host} · встречен {formatDate(source.createdAt, DEFAULT_LANG)} ·{" "}
        сообщений {source.reportCount}, подтверждено {source.confirmedCount}
      </p>
      <p className="id">{source.key}</p>

      <section>
        <h2>Имена</h2>

        {renamed.length > 1 ? (
          <p>
            Имя менялось {renamed.length - 1}{" "}
            {renamed.length === 2 ? "раз" : "раза"}. Само по себе это не
            нарушение — но частая смена имени у аккаунта, о котором нам
            сообщают, повод посмотреть внимательнее.
          </p>
        ) : (
          <p>Другими именами этот источник у нас не встречался.</p>
        )}

        <table>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Впервые</th>
              <th>Последний раз</th>
              <th>Откуда знаем</th>
            </tr>
          </thead>
          <tbody>
            {source.handles.map((handle) => (
              <tr key={`${handle.kind}-${handle.value}`}>
                <td>
                  {handle.kind === "NAME" ? handle.value : `@${handle.value}`}
                  {handle.value === source.handle ? <b> · сейчас</b> : null}
                </td>
                <td>{formatDate(handle.firstSeenAt, DEFAULT_LANG)}</td>
                <td>{formatDate(handle.lastSeenAt, DEFAULT_LANG)}</td>
                <td>
                  {/* Наблюдение машины и утверждение человека — разные вещи,
                      и различать их надо всегда. */}
                  {handle.origin === "manual" ? "вписано вручную" : "из ссылки"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form action={addSourceHandle}>
          <input type="hidden" name="id" value={source.id} />
          <p className="lead">
            У поста в Instagram автора в адресе нет — если открыли ссылку и
            увидели имя, впишите его сюда.
          </p>
          <label>
            <select name="kind">
              <option value="HANDLE">имя в адресе</option>
              <option value="NAME">подпись аккаунта</option>
            </select>
          </label>{" "}
          <input name="value" size={30} placeholder="kaktus.media" />{" "}
          <button type="submit">Добавить</button>
        </form>
      </section>

      <section>
        <h2>Оценка</h2>
        <p>
          Сейчас: <b>{STATUS_NAME[source.status] ?? source.status}</b>
          {source.decidedBy ? ` · ${source.decidedBy}` : ""}
          {source.decidedAt ? ` · ${formatDate(source.decidedAt, DEFAULT_LANG)}` : ""}
        </p>
        {source.reason ? <p>Обоснование: {source.reason}</p> : null}

        <form action={setSourceStatus}>
          <input type="hidden" name="id" value={source.id} />
          <label>
            <select name="status" defaultValue={source.status}>
              {Object.values(SOURCE_STATUS).map((value) => (
                <option key={value} value={value}>
                  {STATUS_NAME[value]}
                </option>
              ))}
            </select>
          </label>
          <p>
            <label>
              Обоснование:
              <br />
              <textarea
                name="reason"
                rows={3}
                cols={70}
                defaultValue={source.reason ?? ""}
                placeholder="За что именно. Со ссылками на номера сообщений."
              />
            </label>
          </p>
          {/* Правило названо вслух, а не только проверено в действии:
              иначе кнопка молча ничего не делает и это выглядит поломкой. */}
          <p className="lead">
            Для «{STATUS_NAME[SOURCE_STATUS.UNTRUSTED]}» и «
            {STATUS_NAME[SOURCE_STATUS.WATCH]}» обоснование обязательно —
            без него оценка не сохранится. Список{" "}
            {NEEDS_REASON.length === 2 ? "этих двух" : "таких"} оценок
            задан в src/lib/enums.ts.
          </p>
          <button type="submit">Сохранить оценку</button>
        </form>
      </section>

      <section>
        <h2>Это тот же аккаунт</h2>
        <p className="lead">
          Аккаунт сменил имя, и мы завели его заново? Впишите номер второй
          записи — её имена и сообщения переедут сюда, а сама она исчезнет.
          Номер виден в адресе её страницы. Действие необратимо.
        </p>
        <form action={mergeSources}>
          <input type="hidden" name="keepId" value={source.id} />
          <input name="mergeId" size={10} placeholder="номер" />{" "}
          <button type="submit">Слить сюда</button>
        </form>
      </section>

      <section>
        <h2>Сообщения об этом источнике</h2>
        {source.reports.length === 0 ? (
          <p>Пока ни одного.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Заголовок</th>
                <th>Решение</th>
                <th>Подано</th>
              </tr>
            </thead>
            <tbody>
              {source.reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.publicId}</td>
                  <td>{report.headline ?? "—"}</td>
                  <td>{REPORT_STATUS_NAME[report.status] ?? report.status}</td>
                  <td>{formatDate(report.createdAt, DEFAULT_LANG)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
