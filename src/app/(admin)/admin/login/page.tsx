import { redirect } from "next/navigation";

import LoginForm from "@/components/admin/LoginForm";
import { currentUser } from "@/lib/auth";
import { isStaff } from "@/lib/enums";
import { signOut } from "@/server/auth-actions";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  const user = await currentUser();

  // Только сотруднику тут делать нечего — его ждёт панель.
  if (user && isStaff(user.role)) redirect("/admin");

  return (
    <div className="panel">
      <h1>Вход для сотрудников</h1>
      <p className="note">
        Страница служебная. Если вы хотите сообщить о нарушении, это{" "}
        <a href="/ru/report">другая форма</a>.
      </p>

      {/*
        Вошедший, но не сотрудник — отдельный случай, и раньше он ломал вход
        насмерть. Панель отправляла его сюда как «не пускать», а эта страница
        видела сессию и отправляла обратно в панель: браузер сдавался с
        «too many redirects». Теперь тупик разорван — ему честно говорят, что
        аккаунт не тот, и дают выйти, чтобы войти служебным.
      */}
      {user ? (
        <div>
          <p>
            Вы вошли как <b>{user.email}</b>. Это обычный аккаунт заявителя, а
            не служебный — доступа к панели у него нет.
          </p>
          <form action={signOut}>
            <button type="submit">Выйти и войти по-другому</button>
          </form>
        </div>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
