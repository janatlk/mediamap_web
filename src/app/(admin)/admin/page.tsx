import { ArrowUpRight, Bot, Check, X } from "lucide-react";

import Attachments from "@/components/report/Attachments";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { DEFAULT_LANG, getDictionary, violationText } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import { approveReport, rejectReport } from "@/server/moderation-actions";
import { loadQueue, type QueueItem } from "@/server/queue-data";

export const metadata = { title: "Очередь" };

// Очередь на проверку. Сверху — то, в чём разбор уверен больше всего.

export const dynamic = "force-dynamic";

/** Название вида по slug. Панель одноязычная, поэтому язык всегда русский. */
const dict = getDictionary(DEFAULT_LANG);
const typeName = (slug: string) => violationText(dict, slug)?.name ?? slug;

function Assessment({ item }: { item: QueueItem }) {
  if (!item.aiVerdict || item.aiConfidence === null) {
    return <span className="text-sm text-muted">оценки нет</span>;
  }

  const percent = Math.round(item.aiConfidence * 100);
  const agrees = item.aiVerdict === item.typeSlug;

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <Bot className="h-4 w-4 text-muted" aria-hidden="true" />
      <span className="font-mono tabular-nums">{percent}%</span>
      <span className="text-muted">
        {item.aiVerdict === "unclear" ? "вид не определён" : typeName(item.aiVerdict)}
      </span>
      {/* Расхождение с выбором заявителя — главное, ради чего оценка нужна
          проверяющему: значит вид, скорее всего, надо поменять. */}
      {!agrees && item.aiVerdict !== "unclear" ? (
        <span className="rounded-xs bg-paper px-2 py-0.5 text-2xs text-muted">
          заявитель выбрал другой вид
        </span>
      ) : null}
    </span>
  );
}

export default async function QueuePage() {
  await requireStaff();
  const queue = await loadQueue();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <h1 className="text-2xl">Очередь на проверку</h1>
      <p className="mt-2 text-muted">
        {queue.length > 0
          ? "Сверху то, в чём разбор уверен больше всего."
          : "Непроверенных сообщений нет."}
      </p>

      <ul className="mt-8 space-y-4">
        {queue.map((item) => (
          <li key={item.id} className="border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <span className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${typeColor(item.typeSlug)}`}
                  aria-hidden="true"
                />
                <span className="text-base">{typeName(item.typeSlug)}</span>
              </span>
              <Assessment item={item} />
              <span className="font-mono text-2xs text-muted">
                {item.publicId} · {formatDate(item.createdAt, DEFAULT_LANG)}
              </span>
            </div>

            <div className="px-5 py-4">
              <p className="max-w-prose whitespace-pre-line">{item.story}</p>

              {/* Приложенное — то, ради чего проверку вообще можно провести:
                  публикацию к этому времени часто уже удалили. */}
              <Attachments items={item.attachments} title="Приложено" />

              <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-signal hover:underline"
                  >
                    {item.source ?? item.link}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span>ссылки нет</span>
                )}
                {item.city ? <span>· {item.city}</span> : null}
              </p>
            </div>

            {/* Обе кнопки в одной форме: заметка пишется один раз и уходит
                с любым решением. */}
            <form className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center">
              <input type="hidden" name="id" value={item.id} />
              <input
                name="note"
                placeholder="Заметка для себя и для заявителя, необязательно"
                className="h-11 flex-1 rounded-xs border border-border bg-paper px-3 text-sm outline-none focus:border-ink"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  formAction={approveReport}
                  className="inline-flex h-11 items-center gap-2 rounded-xs bg-ink px-5 text-sm font-medium text-surface"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Подтвердить
                </button>
                <button
                  type="submit"
                  formAction={rejectReport}
                  className="inline-flex h-11 items-center gap-2 rounded-xs border border-border px-5 text-sm transition-colors hover:bg-paper"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Отклонить
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
