import { Sparkles } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";

/**
 * Анонс проверки информации.
 *
 * Поля ввода здесь намеренно нет. Пока разбор не работает, поле обмануло
 * бы: человек вставил бы текст и не получил ничего. Обещание без поля
 * честнее неработающего поля.
 */
export default function AiTeaser({ dict }: { dict: Dictionary }) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
      <div className="border border-line bg-surface p-6 sm:p-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted" aria-hidden="true" />
          <span className="eyebrow">{dict.home.aiSoon}</span>
        </div>

        <h2 className="mt-3 text-2xl">{dict.home.aiTitle}</h2>
        <p className="mt-3 max-w-prose text-muted">{dict.home.aiLead}</p>
      </div>
    </section>
  );
}
