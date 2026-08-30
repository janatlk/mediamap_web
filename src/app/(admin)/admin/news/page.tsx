import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import { NEWS_LANGS, NEWS_LANG_NAMES, type NewsLang } from "@/lib/news-langs";
import CollectButton from "@/components/admin/CollectButton";
import KeywordForm from "@/components/admin/KeywordForm";
import SourceForm from "@/components/admin/SourceForm";
import {
  removeKeyword,
  removeSource,
  toggleKeyword,
  toggleSource,
} from "@/server/news-actions";

export const metadata = { title: "Дайджест" };

/*
  Настройка сборщика: источники и ключевые слова.

  Две таблицы и две формы. Слова разложены по языкам, потому что применяются
  они по языку источника: русские слова к русским лентам, кыргызские — к
  кыргызским. Один общий список означал бы, что английское «scam» проверяется
  на кыргызской ленте — работы больше, толку никакого.

  Про главное правило отбора на странице сказано прямо: не подошло — не
  сохранили. Это решение проекта, и человек, который правит список слов,
  должен знать, что старое от правки не вернётся.
*/

export const dynamic = "force-dynamic";

const дата = new Intl.DateTimeFormat("ru", {
  dateStyle: "short",
  timeStyle: "short",
});

const день = new Intl.DateTimeFormat("ru", { dateStyle: "short" });

/** Насколько лента протухла. Возвращает пометку или пусто. */
function stale(lastItemAt: Date | null): string {
  if (!lastItemAt) return "";
  const days = Math.floor((Date.now() - lastItemAt.getTime()) / 86_400_000);
  // Шестьдесят дней — тот же порог, по которому сборщик отсекает старое.
  if (days < 60) return "";
  return ` · молчит ${Math.floor(days / 30)} мес.`;
}

export default async function AdminNewsPage() {
  await requireEditor();

  const [sources, keywords, total] = await Promise.all([
    db.newsSource.findMany({ orderBy: [{ lang: "asc" }, { name: "asc" }] }),
    db.newsKeyword.findMany({ orderBy: [{ lang: "asc" }, { word: "asc" }] }),
    db.newsItem.count(),
  ]);

  const byLang = (lang: NewsLang) => keywords.filter((k) => k.lang === lang);

  return (
    <main className="panel">
      <h1>Медиа-дайджест</h1>
      <p className="lead">
        Сборщик обходит ленты по расписанию и сохраняет заметки, которые
        подошли под ключевые слова. Сейчас в базе: {total}.
      </p>

      {/*
        Осталось одно, зато то, что меняет решение: новое слово не вернёт
        уже вышедшее. Правило про сравнение с начала слова переехало под
        поле ввода — туда, где его читают в момент, когда оно нужно.
      */}
      <p className="warn">
        <b>Не подошло — не сохранили.</b> Новое слово работает со следующего
        обхода: старые публикации им не вернуть.
      </p>

      <CollectButton />

      <h2>Источники</h2>
      <p className="note">
        Язык источника решает, какими словами его отбирать. «Брать всё»
        отключает отбор для лент, которые целиком про нашу тему.
      </p>

      <table>
        <thead>
          {/* Столбцов было шесть, и таблица не влезала в экран: последний
              уезжал за край, а весь лист получал горизонтальную прокрутку.
              «Состояние» слито с «Последним обходом» — это про один и тот же
              обход и читается вместе. */}
          <tr>
            <th>Название</th>
            <th>Язык</th>
            <th>Отбор</th>
            <th>Последний обход</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td>
                {source.enabled ? <b>{source.name}</b> : source.name}
                <br />
                <span className="id url">{source.feedUrl}</span>
              </td>
              <td>{NEWS_LANG_NAMES[source.lang as NewsLang] ?? source.lang}</td>
              <td>{source.takeAll ? "брать всё" : "по словам"}</td>
              <td>
                {!source.enabled ? (
                  "выключен"
                ) : source.lastStatus === "error" ? (
                  <span className="status">ошибка: {source.lastError}</span>
                ) : source.lastStatus === "ok" ? (
                  <>
                    в ленте {source.lastFound}, подошло {source.lastKept}
                  </>
                ) : (
                  "ещё не обходили"
                )}
                <br />
                <span className="id">
                  {source.lastRunAt ? дата.format(source.lastRunAt) : "обхода не было"}
                  {source.lastItemAt
                    ? ` · свежая заметка ${день.format(source.lastItemAt)}${stale(source.lastItemAt)}`
                    : ""}
                </span>
              </td>
              <td>
                <form>
                  <input type="hidden" name="id" value={source.id} />
                  <button type="submit" formAction={toggleSource}>
                    {source.enabled ? "Выключить" : "Включить"}
                  </button>{" "}
                  {/* Заметки при удалении остаются: человек убирает ленту,
                      а не полгода собранного дайджеста. */}
                  <button type="submit" className="danger" formAction={removeSource}>
                    Удалить
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sources.length === 0 ? (
        <p className="empty">Источников нет — собирать нечего.</p>
      ) : null}

      <h3>Добавить источник</h3>
      <SourceForm />

      <h2>Ключевые слова</h2>

      {NEWS_LANGS.map((lang) => {
        const list = byLang(lang);
        return (
          <section key={lang}>
            <h3>
              {NEWS_LANG_NAMES[lang]} · {list.filter((k) => k.enabled).length} в
              работе
            </h3>

            {list.length === 0 ? (
              <p className="empty">
                Слов нет. Источники на этом языке не соберут ничего — сборщик
                отметит их ошибкой, чтобы это не выглядело поломкой лент.
              </p>
            ) : (
              <table>
                <tbody>
                  {list.map((word) => (
                    <tr key={word.id}>
                      <td>{word.enabled ? word.word : <s>{word.word}</s>}</td>
                      <td>
                        <form>
                          <input type="hidden" name="id" value={word.id} />
                          <button type="submit" formAction={toggleKeyword}>
                            {word.enabled ? "Выключить" : "Включить"}
                          </button>{" "}
                          <button type="submit" className="danger" formAction={removeKeyword}>
                            Удалить
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <KeywordForm lang={lang} />
          </section>
        );
      })}
    </main>
  );
}
