import type { Dictionary } from "@/lib/i18n";

// Что будет после сообщения и чего мы не делаем. Второе не менее важно:
// про наказание всё равно спросят, и молчать хуже, чем сказать «не можем».
//
// Призыв «Заметили нарушение?» раньше был здесь же вторым разделом — он
// переехал в ReportCta и встал на главной раньше этого блока.
export default function HowItWorks({ dict }: { dict: Dictionary }) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
      <h2 className="text-2xl">{dict.home.howTitle}</h2>

      <ol className="mt-8 grid gap-8 sm:grid-cols-3">
        {dict.home.steps.map((step, index) => (
          <li key={step.title}>
            {/* Номера тут по делу — это последовательность. */}
            <span className="font-mono text-2xs text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-lg">{step.title}</h3>
            <p className="mt-2 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 border-t border-line pt-8">
        <h3 className="text-lg">{dict.home.limitsTitle}</h3>
        <p className="mt-2 max-w-prose text-muted">{dict.home.limitsBody}</p>
      </div>
    </section>
  );
}
