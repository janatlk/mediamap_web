import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import RegionPanel from "@/components/home/RegionPanel";
import { db } from "@/lib/db";
import { DEFAULT_LANG, FORMS, getDictionary } from "@/lib/content";
import { plural, withCount } from "@/lib/plural";
import { REGIONS, regionName } from "@/lib/regions";

/*
  Главная страница.

  Задача страницы одна: объяснить, что это за место, и дать сообщить о
  нарушении. Всё остальное — путь к этим двум вещам.

  Порядок разделов выстроен по вопросам, которые человек задаёт сам:
  что это → сколько тут всего → где → что считается нарушением → что уже
  проверено → что вокруг → что будет, если я напишу.

  Раздел «Виды нарушений» стоит сразу под картой не случайно: его
  карточки с цветными метками заодно расшифровывают цвета точек, и
  отдельная легенда под картой становится не нужна.

  Все числа настоящие и приходят из базы.
*/

// Данные меняются от проверки сообщений, а не каждую секунду.
export const revalidate = 300;

const TYPE_COLOR: Record<string, string> = {
  "hate-speech": "bg-hate",
  disinformation: "bg-disinfo",
  propaganda: "bg-propaganda",
  other: "bg-other",
};

/*
  Пояс задан явно, и это не формальность.

  Сервер может стоять где угодно — на Vercel он по умолчанию в UTC. Дата,
  записанная вечером по Бишкеку, при формировании в UTC покажет вчерашнее
  число. Для сайта о Кыргызстане верное время — бишкекское, независимо от
  того, где крутится приложение.

  Заодно это снимает будущую ловушку: как только дата попадёт в клиентский
  компонент, сервер и браузер в разных поясах дадут разный текст, и React
  сообщит о расхождении при подключении.
*/
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Bishkek",
});

/** Есть ли в строке кириллица. */
const isCyrillic = (text: string) => /[Ѐ-ӿ]/.test(text);

async function getData() {
  const [byRegion, types, latest, newsPool, newsCount, points] = await Promise.all([
    db.report.groupBy({
      by: ["regionCode"],
      where: { status: "APPROVED" },
      _count: { _all: true },
    }),
    db.violationType.findMany({
      orderBy: { sort: "asc" },
      include: {
        _count: { select: { reports: { where: { status: "APPROVED" } } } },
      },
    }),
    db.report.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { violationType: true },
    }),
    // Берём с большим запасом: ниже лента отсеивается по языку и по
    // повторам заголовков. Англоязычные источники обновляются чаще, и
    // без запаса после отсева русских новостей не набиралось на раздел.
    db.newsItem.findMany({ orderBy: { publishedAt: "desc" }, take: 200 }),
    db.newsItem.count(),
    db.report.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        lat: true,
        lng: true,
        violationType: { select: { slug: true } },
      },
    }),
  ]);

  return { byRegion, types, latest, newsPool, newsCount, points };
}

export default async function HomePage() {
  const lang = DEFAULT_LANG;
  const dict = getDictionary(lang);
  const forms = FORMS[lang];
  const { byRegion, types, latest, newsPool, newsCount, points } = await getData();

  const countByRegion = new Map(
    byRegion.map((row) => [row.regionCode, row._count._all]),
  );

  // Идём по списку областей, а не по результату запроса: область без
  // единого сообщения обязана попасть в список с нулём, иначе карта соврёт.
  const regionData = REGIONS.map((region) => ({
    code: region.code,
    name: regionName(region.code, lang),
    count: countByRegion.get(region.code) ?? 0,
  })).sort((a, b) => b.count - a.count);

  const totalReports = regionData.reduce((sum, r) => sum + r.count, 0);
  const coveredRegions = regionData.filter((r) => r.count > 0).length;

  /*
    Лента на языке сайта. Раньше четыре свежие новости из пяти были на
    английском: англоязычные источники обновляются чаще, и сортировка по
    дате выносила наверх именно их. Для русско-кыргызской аудитории это
    была стена нечитаемого текста.

    Если своих новостей не набралось, добираем остальными — пустой
    раздел хуже, чем раздел с чужим языком.
  */
  const NEWS_ON_PAGE = 5;

  // Один и тот же материал приходит из разных лент под разными
  // идентификаторами, и в списке он вставал дважды подряд. Сверяем по
  // заголовку, а не по ссылке: ссылки у перепечаток различаются.
  const seenTitles = new Set<string>();
  const news = [
    ...newsPool.filter((item) => isCyrillic(item.title)),
    ...newsPool.filter((item) => !isCyrillic(item.title)),
  ]
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .slice(0, NEWS_ON_PAGE);

  const stats = [
    { value: totalReports, forms: forms.reports, tail: dict.home.statReports },
    { value: coveredRegions, forms: forms.regions, tail: dict.home.statRegions },
    { value: types.length, forms: forms.categories, tail: dict.home.statCategories },
    { value: newsCount, forms: forms.news, tail: dict.home.statNews },
  ];

  return (
    <>
      {/* --- Что это за место -------------------------------------------- */}
      <section className="mx-auto max-w-[1400px] px-4 pt-12 pb-14 sm:px-6 lg:px-10 lg:pt-16">
        {/* Заголовок и пояснение — одной колонкой. Раньше они стояли в
            двух и были выровнены по нижнему краю, отчего читать
            приходилось зигзагом. */}
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl">
            {dict.home.heroTitle}
          </h1>

          <p className="mt-5 text-lg text-muted">{dict.home.heroSubtitle}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/report"
              className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
            >
              {dict.home.heroPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/map"
              className="inline-flex h-12 items-center rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {dict.home.heroSecondary}
            </Link>
          </div>

          {/* Про анонимность — рядом с кнопкой, а не в глубине сайта:
              для многих это условие, без которого они вообще не напишут. */}
          <p className="mt-3 text-sm text-muted">{dict.home.heroAnonymous}</p>

          <p className="mt-8 text-base text-muted">{dict.home.slogan}</p>
        </div>
      </section>

      {/* --- Сколько собрано --------------------------------------------- */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.tail} className="bg-surface px-4 py-7 sm:px-6">
              <p className="font-display text-3xl tabular-nums">{stat.value}</p>
              <p className="mt-1 text-sm text-muted">
                {plural(stat.value, stat.forms, lang)} {stat.tail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Где ---------------------------------------------------------- */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <RegionPanel
          data={regionData}
          points={points.map((point) => ({
            id: point.id,
            lat: point.lat,
            lng: point.lng,
            typeSlug: point.violationType.slug,
          }))}
          title={dict.home.mapTitle}
          hint={dict.home.mapHint}
          caption={dict.home.mapCaption}
          reportForms={forms.reports}
          lang={lang}
        />
      </section>

      {/* --- Что считается нарушением ------------------------------------ */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl">{dict.home.typesTitle}</h2>
              <p className="mt-2 max-w-prose text-muted">
                {dict.home.typesSubtitle}
              </p>
            </div>
            <Link
              href="/categories"
              className="inline-flex min-h-9 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
            >
              {dict.home.typesAll}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {types.map((type) => {
              const count = type._count.reports;
              const name = lang === "ky" ? type.nameKy : type.nameRu;
              const description = lang === "ky" ? type.descKy : type.descRu;

              const inner = (
                <>
                  {/* Цвет метки совпадает с цветом точек на карте выше —
                      это и есть расшифровка карты. */}
                  <span
                    className={`h-1 w-10 ${TYPE_COLOR[type.slug] ?? "bg-other"}`}
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-lg">{name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{description}</p>
                  <p className="mt-5 text-sm text-muted">
                    {count > 0
                      ? withCount(count, forms.reports, lang)
                      : dict.home.typesEmpty}
                  </p>
                </>
              );

              // Вид без единого сообщения никуда не ссылается: нажатие
              // приводило бы на пустую страницу.
              return (
                <li key={type.slug} className="bg-paper">
                  {count > 0 ? (
                    <Link
                      href={`/categories/${type.slug}`}
                      className="flex h-full flex-col bg-surface p-6 transition-colors hover:bg-paper"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex h-full flex-col bg-surface p-6">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* --- Что уже проверено -------------------------------------------- */}
      {latest.length > 0 ? (
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl">{dict.home.latestTitle}</h2>
              <p className="mt-2 text-muted">{dict.home.latestSubtitle}</p>
            </div>
            <Link
              href="/map"
              className="inline-flex min-h-9 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
            >
              {dict.home.latestAll}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 border-t border-line">
            {latest.map((report) => (
              <li key={report.id} className="border-b border-line">
                {/* Сначала понятное — что и где, — потом дата, и только
                    в конце номер. Раньше номер стоял первым, и человек
                    упирался в MM-2024-0065 раньше, чем в «Язык вражды». */}
                <Link
                  href={`/map?report=${report.publicId}`}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 py-4 transition-colors hover:bg-surface sm:grid-cols-[1fr_10rem_6rem_8rem]"
                >
                  <span className="text-base">
                    {lang === "ky"
                      ? report.violationType.nameKy
                      : report.violationType.nameRu}
                  </span>
                  <span className="col-start-1 text-sm text-muted sm:col-start-auto sm:text-right">
                    {report.city}
                  </span>
                  <span className="col-start-1 text-sm text-muted tabular-nums sm:col-start-auto sm:text-right">
                    {dateFormat.format(report.createdAt)}
                  </span>
                  <span className="col-start-2 row-start-1 font-mono text-2xs text-muted sm:col-start-auto sm:row-start-auto sm:text-right">
                    {report.publicId}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --- Что вокруг ---------------------------------------------------- */}
      {news.length > 0 ? (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl">{dict.home.newsTitle}</h2>
                <p className="mt-2 text-muted">{dict.home.newsSubtitle}</p>
              </div>
              <Link
                href="/news"
                className="inline-flex min-h-9 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
              >
                {dict.home.newsAll}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {/* Без линеек между строками: тремя разделами подряд они
                превращали страницу в одну длинную таблицу. */}
            <ul className="mt-8 space-y-5">
              {news.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <span className="text-base group-hover:text-signal">
                      {item.title}
                      <ArrowUpRight
                        className="ml-1 inline h-3.5 w-3.5 align-baseline text-muted"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{dict.a11y.externalLink}</span>
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {item.source} · {dateFormat.format(item.publishedAt)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* --- Что будет, если я напишу -------------------------------------- */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <h2 className="text-2xl">{dict.home.howTitle}</h2>

        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {dict.home.steps.map((step, index) => (
            <li key={step.title}>
              {/* Нумерация здесь по делу: это последовательность, и
                  порядок шагов человеку нужен. */}
              <span className="font-mono text-2xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg">{step.title}</h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        {/* Честные границы. Умолчание подрывало доверие сильнее, чем
            признание: человек всё равно спросит, накажут ли обидчика. */}
        <div className="mt-12 border-t border-line pt-8">
          <h3 className="text-lg">{dict.home.limitsTitle}</h3>
          <p className="mt-2 max-w-prose text-muted">{dict.home.limitsBody}</p>
        </div>
      </section>

      {/* --- Призыв -------------------------------------------------------- */}
      <section className="bg-ink text-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl">{dict.home.ctaTitle}</h2>
              <p className="mt-2 text-surface/75">{dict.home.ctaBody}</p>
            </div>
            <Link
              href="/report"
              className="inline-flex h-12 items-center gap-2 rounded-xs bg-surface px-6 text-base font-medium text-ink transition-colors hover:bg-paper"
            >
              {dict.home.ctaAction}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
