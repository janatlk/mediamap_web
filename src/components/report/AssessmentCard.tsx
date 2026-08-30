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
  /**
   * Кто читает: заявитель или посторонний на странице опубликованного случая.
   *
   * От этого зависят слова. Заявителю карточка говорит «решение по вашему
   * сообщению» — постороннему это неправда, случай не его. И заметку
   * проверяющего снаружи карточка не показывает: на странице случая она уже
   * стоит отдельным полем, и дублировать её значит показать дважды одно и
   * то же под разными подписями.
   */
  audience?: "author" | "public";
};

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
  audience = "author",
}: Props) {
  const words = dict.assessment;
  const chosenCheck = checks?.[chosenType];
  // Читает посторонний — значит обращение на «вы» тут неуместно.
  const isPublic = audience === "public";

  /*
    Ответили ли мы вообще про то, о чём спросили.

    Голова по выбранному виду могла не отработать — сервис был недоступен
    или оценку снял разбор по словам. Тогда ни числа, ни разбора по этому
    виду нет — и подставлять на их место ответ другой головы нельзя. Человек читает «не берусь ответить», а
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
          {audience === "public"
            ? words.titlePublic
            : reviewed
              ? words.titleReviewed
              : words.title}
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
        Прямого ответа «да, это язык вражды» или «нет, это не он» здесь
        больше нет — по решению проекта.

        Он читался как приговор заявке. Человек написал о чужой публикации,
        а получал короткое «Нет, это не язык вражды» — от машины, которая
        материала часто и не видела, ещё до того как на сообщение посмотрел
        живой проверяющий. Отказ звучал окончательно, хотя окончательным не
        был.

        Остался разбор: что модель нашла, насколько уверена и на чём это
        стоит. Он говорит ровно столько, сколько мы знаем, и не
        притворяется решением.

        Строка ниже — на чём разбор стоит. Она нужна ровно потому, что без
        неё человек читает оценку как приговор материалу: он написал о
        чужой публикации, а модель разбирала его собственные слова о ней.
        Один раз так и вышло — заявитель спросил про видео в инстаграме, и
        мы уверенно ответили про видео, которого никто не открывал.
      */}
      {overridden ? null : (
        <p className="border-b border-line px-6 py-3 text-sm text-muted">
          {basis === "image"
            ? words.checkedImage
            : basis === "link"
              ? isPublic
                ? words.checkedLinkPublic
                : words.checkedLink
              : isPublic
                ? words.checkedStoryPublic
                : words.checkedStory}
          {/* Ссылка была, но открыть её не вышло — про это надо сказать
              отдельно, иначе человек решит, что публикацию посмотрели. */}
          {basis === "story" && hasLink ? ` ${words.checkedLinkFailed}` : ""}
        </p>
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
              {matchesChoice
                ? isPublic
                  ? words.verdictMatchesPublic
                  : words.verdictMatches
                : isPublic
                  ? words.verdictDiffersPublic
                  : words.verdictDiffers}
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

      {/* Разбор словами — и только он. Перечень примет, которым отвечал
          разбор по словам, отсюда убран: он говорил про устройство нашего
          подсчёта («Описание подробное»), а не про случай человека. Нечего
          сказать — блока просто нет. */}
      {explanation ? (
        <div className="border-t border-line px-6 py-5">
          <p className="text-sm text-muted">{words.reasonsLabel}</p>
          <p className="mt-3 max-w-prose text-base">{explanation}</p>
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
