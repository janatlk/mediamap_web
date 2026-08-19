import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Mail, Phone, Send } from "lucide-react";

import { CONTACTS, phoneHref } from "@/lib/contacts";
import { getDictionary, isReadyLanguage } from "@/lib/i18n";

// Контакты. Три канала связи и отсылка к форме: сообщения о нарушениях
// через переписку теряются, для них есть отдельный путь.

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = getDictionary(lang);
  return { title: dict.contactsPage.title, description: dict.contactsPage.lead };
}

/** Карточка канала связи. Значение всегда ссылка — иначе его надо копировать руками. */
function Channel({
  icon,
  title,
  body,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <li className="bg-paper">
      <div className="flex h-full flex-col bg-surface p-6">
        <span className="text-muted" aria-hidden="true">
          {icon}
        </span>

        <h2 className="mt-4 text-lg">{title}</h2>
        <p className="mt-2 flex-1 text-sm text-muted">{body}</p>

        <a
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="mt-5 inline-flex min-h-9 items-center gap-1.5 py-1 text-base text-signal hover:underline"
        >
          {value}
          {external ? (
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          ) : null}
        </a>
      </div>
    </li>
  );
}

export default async function ContactsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = getDictionary(lang);
  const page = dict.contactsPage;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{page.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">{page.lead}</p>

      <ul className="mt-10 grid gap-px bg-line sm:grid-cols-3">
        <Channel
          icon={<Send className="h-5 w-5" />}
          title={page.telegramTitle}
          body={page.telegramBody}
          value={page.telegramAction}
          href={CONTACTS.telegram}
          external
        />
        <Channel
          icon={<Mail className="h-5 w-5" />}
          title={page.emailTitle}
          body={page.emailBody}
          value={CONTACTS.email}
          href={`mailto:${CONTACTS.email}`}
        />
        <Channel
          icon={<Phone className="h-5 w-5" />}
          title={page.phoneTitle}
          body={page.phoneBody}
          value={CONTACTS.phone}
          href={phoneHref}
        />
      </ul>

      {/* Сообщения о нарушениях через переписку теряются: нет номера, нет
          статуса, нет очереди на проверку. Уводим на форму. */}
      <section className="mt-12 max-w-3xl border-t border-line pt-8">
        <h2 className="text-2xl">{page.reportTitle}</h2>
        <p className="mt-3 text-muted">{page.reportBody}</p>

        <Link
          href={`/${lang}/report`}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
        >
          {dict.nav.report}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
