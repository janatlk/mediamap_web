import Link from "next/link";

import { SOURCE_STATUS } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { DEFAULT_LANG } from "@/lib/i18n";
import { PLATFORM_NAME, type Platform } from "@/lib/platforms";
import { countByStatus, loadSources } from "@/server/sources-data";

export const metadata = { title: "Источники" };
export const dynamic = "force-dynamic";

/*
  Реестр источников: чёрный и белый списки в одной таблице.

  Двух отдельных страниц нет намеренно. Список один, у записи одно
  состояние, и разводить их по страницам значило бы, что источник,
  переехавший из белого в чёрный, исчезает из одного места и появляется в
  другом — а нужно видеть, что он переехал.

  Большинство записей навсегда останется в «ничего не утверждаем», и это
  правильно: реестр — журнал встреч, а не список обвинённых.
*/

export const STATUS_NAME: Record<string, string> = {
  [SOURCE_STATUS.UNTRUSTED]: "Не доверяем",
  [SOURCE_STATUS.WATCH]: "Присмотреться",
  [SOURCE_STATUS.TRUSTED]: "Доверяем",
  [SOURCE_STATUS.UNKNOWN]: "Ничего не утверждаем",
};

const TABS = [
  { value: SOURCE_STATUS.UNTRUSTED, label: "Чёрный список" },
  { value: SOURCE_STATUS.WATCH, label: "Присмотреться" },
  { value: SOURCE_STATUS.TRUSTED, label: "Белый список" },
  { value: SOURCE_STATUS.UNKNOWN, label: "Без оценки" },
  { value: "ALL", label: "Все" },
];

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireStaff();

  const params = await searchParams;
  const status = params.status ?? SOURCE_STATUS.UNTRUSTED;
  const query = params.q ?? "";

  const [rows, counts] = await Promise.all([
    loadSources({ status, query }),
    countByStatus(),
  ]);

  const renamed = rows.filter((row) => row.handleCount > 1).length;

  return (
    <div className="panel">
      <h1>Источники</h1>
      <p className="lead">
        Аккаунты и издания, о которых к нам приходили сообщения. Запись
        заводится сама при подаче ссылки — без оценки. Оценку ставит человек,
        и «не доверяем» без обоснования поставить нельзя.
      </p>

      <p>
        {TABS.map((tab, index) => (
          <span key={tab.value}>
            {index > 0 ? " | " : ""}
            {tab.value === status ? (
              <b>
                {tab.label} ({counts[tab.value] ?? 0})
              </b>
            ) : (
              <Link href={`/admin/sources?status=${tab.value}`}>
                {tab.label} ({counts[tab.value] ?? 0})
              </Link>
            )}
          </span>
        ))}
      </p>

      <form method="get">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={query}
          size={40}
          placeholder="имя аккаунта, в том числе прежнее"
        />{" "}
        <button type="submit">Искать</button>
      </form>

      {renamed > 0 ? (
        <p className="lead">
          В этом списке {renamed} источников, у которых имя менялось. Такие
          отмечены словом «переименований».
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p>Ничего не найдено.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Источник</th>
              <th>Площадка</th>
              <th>Оценка</th>
              <th>Сообщений</th>
              <th>Первая встреча</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/admin/sources/${row.id}`}>
                    {row.handle ? `@${row.handle}` : row.host}
                  </Link>
                  {row.handleCount > 1 ? (
                    <>
                      {" "}
                      <span className="id">
                        · {row.handleCount} переименований
                      </span>
                    </>
                  ) : null}
                  {row.displayName ? (
                    <>
                      <br />
                      <span className="id">{row.displayName}</span>
                    </>
                  ) : null}
                </td>
                <td>{PLATFORM_NAME[row.platform as Platform] ?? row.platform}</td>
                <td>
                  {STATUS_NAME[row.status] ?? row.status}
                  {row.decidedBy ? (
                    <>
                      <br />
                      <span className="id">{row.decidedBy}</span>
                    </>
                  ) : null}
                </td>
                <td>
                  {/* Подтверждённые отдельно: десять сообщений, из которых
                      не подтвердилось ни одного, — это не то же самое, что
                      десять подтверждённых. */}
                  {row.reportCount} / подтверждено {row.confirmedCount}
                </td>
                <td>{formatDate(row.createdAt, DEFAULT_LANG)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
