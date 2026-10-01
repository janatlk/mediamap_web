import QuestionForm from "@/components/admin/QuestionForm";
import { requireEditor } from "@/lib/guard";
import { loadAllQuestions } from "@/server/quiz";
import {
  removeQuestion,
  shiftQuestion,
  toggleQuestion,
} from "@/server/quiz-actions";

export const metadata = { title: "Проверь себя" };

/*
  Вопросы теста.

  Пока вопросов нет, страница «Проверь себя» на сайте показывает честную
  заглушку. Появился первый — показывается тест.
*/

export const dynamic = "force-dynamic";

const варианты = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export default async function AdminQuizPage() {
  await requireEditor();
  const questions = await loadAllQuestions();

  return (
    <>
      <h1>Проверь себя</h1>
      <p className="note">
        Вопросы для теста на сайте. Пока здесь пусто, страница «Проверь себя»
        показывает заглушку.
      </p>

      <section>
        <h2>Добавить вопрос</h2>
        <QuestionForm />
      </section>

      <section>
        <h2>Вопросы ({questions.length})</h2>

        {questions.length === 0 ? (
          <p className="note">Пока ни одного вопроса.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Вопрос</th>
                <th>Варианты</th>
                <th>Порядок</th>
                <th>Показ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {questions.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    {item.question}
                    {item.explanation ? (
                      <>
                        <br />
                        <span className="note">{item.explanation}</span>
                      </>
                    ) : (
                      <>
                        <br />
                        <span className="note">без пояснения</span>
                      </>
                    )}
                  </td>
                  <td>
                    <ol>
                      {варианты(item.options).map((option, at) => (
                        <li key={option}>
                          {at === item.correct ? <b>{option}</b> : option}
                        </li>
                      ))}
                    </ol>
                  </td>
                  <td>
                    <form action={shiftQuestion} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="up" value="1" />
                      <button type="submit" disabled={index === 0}>
                        ↑
                      </button>
                    </form>{" "}
                    <form action={shiftQuestion} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" disabled={index === questions.length - 1}>
                        ↓
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={toggleQuestion}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit">
                        {item.published ? "показывается" : "скрыт"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={removeQuestion}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit">Удалить</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
