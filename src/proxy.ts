import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LANG, LANGUAGES, READY_LANGUAGES } from "@/lib/i18n/languages";

/**
 * Язык живёт в адресе: /ru/..., /ky/...
 *
 * Так каждая языковая версия — отдельная страница со своим адресом. Её
 * можно переслать, сохранить в закладки и проиндексировать поиском; для
 * публичной платформы это существеннее, чем удобство одного адреса.
 *
 * Здесь решается только одно: с какого адреса на какой отправить.
 */

const READY = new Set<string>(READY_LANGUAGES);
const ALL = new Set<string>(LANGUAGES.map((language) => language.code));

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Запрос файла (favicon.ico, robots.txt, картинка) языка не имеет.
  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return NextResponse.next();
  const [, first, ...rest] = pathname.split("/");

  if (READY.has(first)) return NextResponse.next();

  const target = request.nextUrl.clone();

  // Язык из списка, но перевода ещё нет — ведём на язык по умолчанию,
  // сохраняя путь: /en/about превращается в /ru/about, а не в отказ.
  target.pathname = ALL.has(first)
    ? `/${DEFAULT_LANG}/${rest.join("/")}`
    : `/${DEFAULT_LANG}${pathname}`;

  return NextResponse.redirect(target);
}

export const config = {
  /*
    Никаких экранированных символов в этом выражении намеренно нет.
    Раньше здесь стояла проверка на точку вида `.*\.`, но при правке файла
    обратный слэш потерялся, выражение стало значить «любой непустой путь»,
    и обработчик перестал срабатывать везде, кроме корня. Отсеиваем только
    служебные пути Next.js, а файлы отбрасываем в коде — там это видно.
  */
  matcher: ["/((?!_next/|api/).*)"],
};
