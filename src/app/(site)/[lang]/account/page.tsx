import { notFound, redirect } from "next/navigation";
import { Clock } from "lucide-react";

import EmailNotifications from "@/components/account/EmailNotifications";
import MyReports from "@/components/report/MyReports";
import { currentUser } from "@/lib/auth";
import { isReadyLanguage } from "@/lib/i18n";
import { signOutAccount } from "@/server/account-actions";
import { getContent } from "@/server/content";

// Страница аккаунта. Список сообщений тот же компонент, что и для
// анонимных: он и так берёт ключи из браузера, а привязка к аккаунту нужна
// для другого — чтобы сообщения нашлись на другом устройстве.

export const dynamic = "force-dynamic";

type Params = { lang: string };

export default async function AccountPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const user = await currentUser();
  if (!user) redirect(`/${lang}/account/login`);

  const dict = await getContent(lang);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl">{dict.account.title}</h1>
            <p className="mt-2 text-muted">{user.name ?? user.email}</p>
          </div>

          <form action={signOutAccount}>
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-xs border border-border px-5 text-sm transition-colors hover:bg-surface"
            >
              {dict.account.signOut}
            </button>
          </form>
        </div>

        {/* Заголовок над списком. Без него страница выглядела так, будто
            аккаунт и есть список сообщений; со словом «История» видно, что
            это один из разделов профиля, а не всё его содержимое. */}
        <h2 className="mt-10 flex items-center gap-2 text-xl">
          <Clock className="h-5 w-5 text-muted" aria-hidden="true" />
          {dict.account.history}
        </h2>

        <EmailNotifications dict={dict} enabled={user.notifyByEmail} />

        <MyReports dict={dict} lang={lang} signedIn />
      </div>
    </div>
  );
}
