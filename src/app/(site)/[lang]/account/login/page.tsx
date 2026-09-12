import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import AccountForm from "@/components/account/AccountForm";
import { currentUser } from "@/lib/auth";
import { isReadyLanguage } from "@/lib/i18n";
import { availableProviders } from "@/lib/oauth";
import { getContent } from "@/server/content";

type Params = { lang: string };
type Query = { error?: string };

// Своё название вкладки: без него вход ничем не отличался от главной ни во
// вкладке, ни в истории браузера.
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.account.loginTitle, robots: { index: false } };
}

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
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-md">
      <h1 className="text-3xl sm:text-4xl">{dict.account.loginTitle}</h1>

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
    </div>
  );
}
