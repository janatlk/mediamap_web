import { notFound, redirect } from "next/navigation";

import AccountForm from "@/components/account/AccountForm";
import { currentUser } from "@/lib/auth";
import { isReadyLanguage } from "@/lib/i18n";
import { availableProviders } from "@/lib/oauth";
import { getContent } from "@/server/content";

type Params = { lang: string };
type Query = { error?: string };

export default async function AccountLoginPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  // Вошедшему тут делать нечего.
  if (await currentUser()) redirect(`/${lang}/account`);

  const dict = await getContent(lang);
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl">{dict.account.loginTitle}</h1>

      <div className="mt-10">
        <AccountForm
          dict={dict}
          lang={lang}
          mode="login"
          providers={availableProviders()}
          externalError={error}
        />
      </div>
    </div>
  );
}
