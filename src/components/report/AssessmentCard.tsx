import { Bot, Check, Clock, HelpCircle, X } from "lucide-react";

import { violationText, type Dictionary } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import type { Assessment } from "@/server/ai-review";
import type { TypeCheck } from "@/server/ml-service";

// Показ предварительной оценки.
//
// Три вещи, которые человек должен унести с этой карточки: что решил
// разбор, насколько он в этом уверен и что решение всё равно за человеком.
// Последнее — не мелкий шрифт внизу, а полноценный блок: сообщение не
// опубликовано, пока его не посмотрит сотрудник.

type Props = {
  dict: Dictionary;
  /** Оценка плюс обоснование словами, если её дала модель. */
  assessment: Assessment & { explanation?: string | null };
  chosenType: string;
  /** Ответ модели по каждому виду. Пусто у разбора по словам и старых записей. */
  checks?: Partial<Record<string, TypeCheck>>;
  /** Решение человека: PENDING | APPROVED | REJECTED. */
  status: string;
  /** Сообщение уже посмотрел живой человек. */
  reviewed?: boolean;
  /** Его заметка к решению, если оставил. */
  moderatorComment?: string | null;
  /** Пояснение, переписанное проверяющим. Старше всех прочих. */
  reviewSummary?: string | null;
  /** Проверяющий поменял вердикт, уверенность или пояснение. */
  overridden?: boolean;
  /** По чему судила модель: снимок, ссылка или пересказ заявителя. */
  basis?: "image" | "link" | "story";
  /** Заявитель оставил ссылку — про неё нужна отдельная оговорка. */
  hasLink?: boolean;
};

/** Ниже этого уверенность слишком мала, чтобы отвечать «нет». */
const SURE_ENOUGH = 0.7;

/**
 * Название вида внутрь фразы — со строчной буквы.
 *
 * В словаре виды записаны как заголовки: «Дезинформация», «Язык вражды». В
 * подписи к полю это верно, а в середине предложения получалось «это не
 * Дезинформация» — будто название организации.
 */
const inSentence = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

/*
  Прямой ответ на то, что заявил человек.

  Карточка объясняла, что решила модель, но не отвечала на вопрос, с которым
  человек пришёл. Он выбрал «дезинформация» — и хотел услышать, дезинформация
  это или нет. Вместо этого он читал «Вид не определён», а ниже разбор,
  который до конца дочитывает не всякий.

  Три возможных ответа, и третий не хуже первых двух: «не берусь». Он
  честнее, чем «нет» на пустом месте, а к тому же прямо ведёт к тому, что
  сообщение всё равно смотрит человек.
*/
function Conclusion({
  dict,
  chosenType,
  check,
  verdict,
  source,
}: {
  dict: Dictionary;
  chosenType: string;
  check?: TypeCheck;
  verdict: Assessment["verdict"];
  source: Assessment["source"];
}) {
  const words = dict.assessment.conclusion;
  const chosenName = inSentence(violationText(dict, chosenType)?.name ?? chosenType);

  // Вид, который модель всё-таки нашла, если он не тот, что выбрал человек.
  const other =
    verdict !== "unclear" && verdict !== chosenType
      ? inSentence(violationText(dict, verdict)?.name ?? verdict)
      : null;

  const answer = ((): { text: string; sure: boolean } => {
    // Оценку снимал разбор по словам: у него нет мнения о видах, есть
    // совпадения слов. Выдавать это за ответ модели нельзя.
    if (source === "rules" || !check) {
      return { text: words.notChecked, sure: false };
    }
    if (check.found) {
      return { text: words.yes.replace("{type}", chosenName), sure: true };
    }
    if (check.confidence < SURE_ENOUGH) {
      return { text: words.unsure, sure: false };
    }
    return { text: words.no.replace("{type}", chosenName), sure: true };
  })();

  return (
    <div className="border-b border-line px-6 py-5">
      <p className="text-sm text-muted">{words.title}</p>
      <p className="mt-2 flex items-start gap-2 text-lg">
        {/* Знак вопроса только у неуверенного ответа: у «да» и «нет» вид
            нейтральный. Галочка рядом с «нет, это не дезинформация» читалась
            бы как «всё в порядке», хотя мы не о том. */}
        {answer.sure ? null : (
          <HelpCircle
            className="mt-1.5 h-4 w-4 shrink-0 text-muted"
            aria-hidden="true"
          />
        )}
        <span className="max-w-prose">{answer.text}</span>
      </p>

      {other ? (
        <p className="mt-2 max-w-prose text-base text-muted">
          {words.butOther.replace("{other}", other)}
        </p>
      ) : null}
    </div>
  );
}

/*
  Уверенность — словом, без процентов.

  Процент убран намеренно. Модель почти всегда отвечала 0.99: из двенадцати
  оценок девять были ровно такими. Число, которое всегда одно и то же, ничего
  не измеряет — это речевая привычка модели, а не мера. Мы же рисовали его
  зелёной полосой во всю ширину и тем обещали человеку точность, которой у
  нас нет. Слово честнее: оно не притворяется измерением.

  Проверяющему в панели проценты остались — ему нужно сырое число, чтобы
  сравнивать оценки между собой.
*/
type Certainty = { word: string; color: string };

function certainty(
  value: number,
  sawMaterial: boolean,
  dict: Dictionary,
): Certainty {
  const words = dict.assessment;

  /*
    Материала модель не видела — «высокая» тут не бывает, что бы она ни
    ответила. Оценка сделана по пересказу заявителя, а пересказ и материал
    расходятся ровно в тех случаях, ради которых всё и затевалось.
  */
  const ceiling = sawMaterial ? value : Math.min(value, 0.59);

  if (ceiling < 0.35) return { word: words.confidenceLow, color: "text-trust-low" };
  if (ceiling < 0.6) return { word: words.confidenceMedium, color: "text-trust-mid" };
  return { word: words.confidenceHigh, color: "text-trust-high" };
}

export default function AssessmentCard({
  dict,
  assessment,
  chosenType,
  checks,
  status,
  reviewed = false,
  overridden = false,
  moderatorComment,
  reviewSummary,
  basis = "story",
  hasLink = false,
}: Props) {
  const words = dict.assessment;
  const chosenCheck = checks?.[chosenType];

  /*
    Ответили ли мы вообще про то, о чём спросили.

    Головы у нас есть не на все виды: цифровое мошенничество не проверяет
    никто. Тогда ни числа, ни разбора по этому виду нет — и подставлять на их
    место ответ другой головы нельзя. Человек читает «не берусь ответить», а
    ниже — рассуждение про язык вражды, которого он не спрашивал.
  */
  const answeredChosen = Boolean(chosenCheck);
  const foundSomething = assessment.verdict !== "unclear";

  /*
    Чью уверенность показываем.

    Если модель нашла нарушение — уверенность в найденном виде, это и есть
    вердикт. Если не нашла ничего, вердикта как такового нет, и число должно
    относиться к тому виду, о котором спросил человек. Иначе выходило, что
    заявителю про дезинформацию показывают 99% уверенности в том, что перед
    нами не язык вражды, — цифру от вопроса, которого он не задавал.
  */
  const shownConfidence =
    assessment.verdict === "unclear" && chosenCheck
      ? chosenCheck.confidence
      : assessment.confidence;

  // Ничего не нашли и выбранный вид не проверяли — числу взяться неоткуда.
  // Показывать тут 99% рядом с «не берусь ответить» — прямое враньё.
  const hasConfidence = foundSomething || answeredChosen;

  /*
    Что именно проверяли. Решение человека здесь ни при чём: если он ничего
    не менял, на странице по-прежнему стоит оценка модели, и оговорка нужна.
  */
  const sawMaterial = basis !== "story" || overridden;
  const trust = certainty(shownConfidence, sawMaterial, dict);

  const isUnclear = assessment.verdict === "unclear";
  const verdictName = isUnclear
    ? words.verdictUnclear
    : (violationText(dict, assessment.verdict)?.name ?? assessment.verdict);

  const matchesChoice = assessment.verdict === chosenType;

  /*
    Обоснование берём по выбранному виду, а общее — только если такого нет.
    Иначе на заявку про дезинформацию человек читал разбор про язык вражды:
    первая голова отвечала на свой вопрос, а спрашивали не её.
  */
  /*
    Разбор показываем, только если он про то, о чём спросили: либо это ответ
    головы по выбранному виду, либо модель нашла нарушение и объясняет его.
    Общий текст первой головы на роль ответа не годится.
  */
  const explanation =
    reviewSummary ||
    chosenCheck?.explanation ||
    (foundSomething ? assessment.explanation : null);

  return (
    <section className="mt-8 border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-4">
        <Bot className="h-4 w-4 text-muted" aria-hidden="true" />
        <h2 className="text-base font-medium">
          {reviewed ? words.titleReviewed : words.title}
        </h2>
        <span className="font-mono text-2xs text-muted">
          {reviewed
            ? words.conclusion.reviewedBy
            : assessment.source === "rules"
              ? words.sourceRules
              : words.sourceModel}
        </span>
      </header>

      {/*
        Вывод — это ответ модели, и показывается он только пока ответ её.

        Проверяющий подтверждает разбор целиком, а не выбирает вид нарушения,
        поэтому писать от его имени «подтвердил нарушение — дезинформация»
        было неправдой: такого решения он не принимал. А если он переписал
        вердикт, уверенность или пояснение, прежний вывод модели описывает
        уже не тот ответ, что на странице, — и его нет.
      */}
      {overridden ? null : (
        <>
          <Conclusion
            dict={dict}
            chosenType={chosenType}
            check={chosenCheck}
            verdict={assessment.verdict}
            source={assessment.source}
          />

          {/*
            На чём стоит вывод. Строка нужна ровно потому, что без неё
            человек читает вывод как приговор материалу: он написал о чужой
            публикации, а модель разбирала его собственные слова о ней. Один
            раз так и вышло — заявитель спросил про видео в инстаграме, и мы
            уверенно ответили про видео, которого никто не открывал.
          */}
          <p className="border-b border-line px-6 py-3 text-sm text-muted">
            {basis === "image"
              ? words.checkedImage
              : basis === "link"
                ? words.checkedLink
                : words.checkedStory}
            {/* Ссылка была, но открыть её не вышло — про это надо сказать
                отдельно, иначе человек решит, что публикацию посмотрели. */}
            {basis === "story" && hasLink ? ` ${words.checkedLinkFailed}` : ""}
          </p>
        </>
      )}

      <div className="grid gap-px bg-line sm:grid-cols-3">
        <div className="bg-surface px-6 py-5">
          <p className="text-sm text-muted">{words.verdictLabel}</p>
          <p className="mt-2 flex items-center gap-2 text-lg">
            {isUnclear ? null : (
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${typeColor(assessment.verdict)}`}
                aria-hidden="true"
              />
            )}
            {verdictName}
          </p>
          {/* Расхождение с выбором человека — это не ошибка, а повод
              уточнить. Говорим об этом сразу, чтобы не выглядело спором. */}
          {!isUnclear ? (
            <p className="mt-1 text-sm text-muted">
              {matchesChoice ? words.verdictMatches : words.verdictDiffers}
            </p>
          ) : null}
        </div>

        <div className="bg-surface px-6 py-5">
          <p className="text-sm text-muted">
            {reviewed ? words.confidenceLabelReviewed : words.confidenceLabel}
          </p>
          {hasConfidence ? (
            <p className={`mt-2 text-lg ${trust.color}`}>{trust.word}</p>
          ) : (
            <p className="mt-2 text-lg text-muted">{words.confidenceUnknown}</p>
          )}
          {/* Цвет дублирует слово, а не заменяет его: одним цветом
              различать нельзя — есть и дальтонизм, и печать. */}

        </div>

        <div className="bg-surface px-6 py-5">
          <p className="text-sm text-muted">{words.adminLabel}</p>
          <p className="mt-2 flex items-center gap-2 text-lg">
            {status === "APPROVED" ? (
              <>
                <Check className="h-4 w-4 text-signal" aria-hidden="true" />
                {words.adminApproved}
              </>
            ) : status === "REJECTED" ? (
              <>
                <X className="h-4 w-4 text-muted" aria-hidden="true" />
                {words.adminRejected}
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
                {words.adminPending}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Модель отвечает связным текстом, разбор по словам — перечнем примет.
          Одно другим не заменяется: список из обрывков предложений читался
          как набор бессвязных пунктов. */}
      {explanation ? (
        <div className="border-t border-line px-6 py-5">
          <p className="text-sm text-muted">{words.reasonsLabel}</p>
          <p className="mt-3 max-w-prose text-base">{explanation}</p>
        </div>
      ) : assessment.reasons.length ? (
        <div className="border-t border-line px-6 py-5">
          <p className="text-sm text-muted">{words.reasonsLabel}</p>
          <ul className="mt-3 space-y-2">
            {assessment.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-base">
                <Check
                  className="mt-1 h-4 w-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {words.reasons[reason as keyof typeof words.reasons] ?? reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {moderatorComment ? (
        <div className="border-t border-line px-6 py-5">
          <p className="text-sm text-muted">{words.conclusion.reviewedNote}</p>
          <p className="mt-3 max-w-prose text-base">{moderatorComment}</p>
        </div>
      ) : null}

      {/* Оговорка полновесная, а не мелким шрифтом: показывать проценты и
          умалчивать, чего они стоят, — обманывать. */}
      {/* После решения человека оговорка снимается: она предупреждала, что
          отвечала машина и ответ ещё не проверен. И то и другое перестаёт
          быть правдой, как только сообщение посмотрел сотрудник. */}
      {reviewed ? null : (
        <p className="border-t border-line bg-paper px-6 py-5 text-sm text-muted">
          {assessment.source === "rules"
            ? words.disclaimerRules
            : words.disclaimerModel}
        </p>
      )}
    </section>
  );
}
