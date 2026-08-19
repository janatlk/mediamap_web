import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LANG, LANGUAGES, READY_LANGUAGES } from "@/lib/i18n/languages";

// Язык в адресе: /ru/..., /ky/... Каждая версия — своя страница: можно
// переслать, положить в закладки, отдать поисковику.
//
// Тут решается ровно одно — куда перенаправить.

const READY = new Set<string>(READY_LANGUAGES);
const ALL = new Set<string>(LANGUAGES.map((language) => language.code));

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Админка одноязычная: сотрудники работают на русском, второй перевод
  // для служебных экранов городить незачем.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.next();
  }

  // Запрос файла (favicon.ico, robots.txt, картинка) языка не имеет.
  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return NextResponse.next();
  const [, first, ...rest] = pathname.split("/");

  if (READY.has(first)) return NextResponse.next();

  const target = request.nextUrl.clone();

  // Язык знаем, но перевода нет — ведём на дефолтный, путь сохраняем:
  // /en/about → /ru/about, а не 404.
  target.pathname = ALL.has(first)
    ? `/${DEFAULT_LANG}/${rest.join("/")}`
    : `/${DEFAULT_LANG}${pathname}`;

  return NextResponse.redirect(target);
}

export const config = {
  // Без экранирования. Тут была проверка на точку, слэш при правке
  // потерялся, и выражение стало значить «любой непустой путь» — всё,
  // кроме корня, проходило мимо. Файлы теперь отсеиваем выше, в коде.
  matcher: ["/((?!_next/|api/).*)"],
};
