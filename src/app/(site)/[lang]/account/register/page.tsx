import { notFound, redirect } from "next/navigation";

import AccountForm from "@/components/account/AccountForm";
import { currentUser } from "@/lib/auth";
import { isReadyLanguage } from "@/lib/i18n";
import { availableProviders } from "@/lib/oauth";
import { getContent } from "@/server/content";

type Params = { lang: string };

export default async function AccountRegisterPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();
  if (await currentUser()) redirect(`/${lang}/account`);

  const dict = await getContent(lang);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl">{dict.account.registerTitle}</h1>
      <p className="mt-3 text-muted">{dict.account.registerLead}</p>

      <div className="mt-10">
        <AccountForm
          dict={dict}
          lang={lang}
          mode="register"
          providers={availableProviders()}
        />
      </div>
    </div>
  );
}
