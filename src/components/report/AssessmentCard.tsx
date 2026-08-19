import { Bot, Check, Clock } from "lucide-react";

import { violationText, type Dictionary } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import type { Assessment } from "@/server/ai-review";

// Показ предварительной оценки.
//
// Три вещи, которые человек должен унести с этой карточки: что решил
// разбор, насколько он в этом уверен и что решение всё равно за человеком.
// Последнее — не мелкий шрифт внизу, а полноценный блок: сообщение не
// опубликовано, пока его не посмотрит сотрудник.

type Props = {
  dict: Dictionary;
  assessment: Assessment;
  chosenType: string;
};

/** Словами, а не только числом: «0.42» человеку ничего не говорит. */
function confidenceWord(value: number, dict: Dictionary): string {
  const words = dict.assessment;
  if (value < 0.35) return words.confidenceLow;
  if (value < 0.6) return words.confidenceMedium;
  return words.confidenceHigh;
}

export default function AssessmentCard({ dict, assessment, chosenType }: Props) {
  const words = dict.assessment;
  const percent = Math.round(assessment.confidence * 100);

  const isUnclear = assessment.verdict === "unclear";
  const verdictName = isUnclear
    ? words.verdictUnclear
    : (violationText(dict, assessment.verdict)?.name ?? assessment.verdict);

  const matchesChoice = assessment.verdict === chosenType;

  return (
    <section className="mt-8 border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-4">
        <Bot className="h-4 w-4 text-muted" aria-hidden="true" />
        <h2 className="text-base font-medium">{words.title}</h2>
        <span className="font-mono text-2xs text-muted">
          {assessment.source === "rules" ? words.sourceRules : words.sourceModel}
        </span>
      </header>

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
          <p className="text-sm text-muted">{words.confidenceLabel}</p>
          <p className="mt-2 text-lg tabular-nums">
            {percent}%{" "}
            <span className="text-base text-muted">
              {confidenceWord(assessment.confidence, dict)}
            </span>
          </p>
          <span
            className="mt-3 block h-1.5 w-full bg-line"
            aria-hidden="true"
          >
            <span
              className="block h-full bg-ink"
              style={{ width: `${percent}%` }}
            />
          </span>
        </div>

        <div className="bg-surface px-6 py-5">
          <p className="text-sm text-muted">{words.adminLabel}</p>
          <p className="mt-2 flex items-center gap-2 text-lg">
            <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
            {words.adminPending}
          </p>
        </div>
      </div>

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

      {/* Оговорка полновесная, а не мелким шрифтом: показывать проценты и
          умалчивать, чего они стоят, — обманывать. */}
      <p className="border-t border-line bg-paper px-6 py-5 text-sm text-muted">
        {assessment.source === "rules"
          ? words.disclaimerRules
          : words.disclaimerModel}
      </p>
    </section>
  );
}
