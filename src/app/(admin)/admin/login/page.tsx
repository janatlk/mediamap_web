import { redirect } from "next/navigation";

import LoginForm from "@/components/admin/LoginForm";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  // Вошедшему тут делать нечего.
  if (await currentUser()) redirect("/admin");

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl">Вход для сотрудников</h1>
      <p className="mt-2 text-sm text-muted">
        Страница служебная. Если вы хотите сообщить о нарушении, это{" "}
        <a href="/ru/report" className="text-signal hover:underline">
          другая форма
        </a>
        .
      </p>

      <div className="mt-10">
        <LoginForm />
      </div>
    </div>
  );
}
