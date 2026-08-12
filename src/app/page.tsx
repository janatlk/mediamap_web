import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import RegionPanel from "@/components/home/RegionPanel";
import { db } from "@/lib/db";
import { DEFAULT_LANG, getDictionary } from "@/lib/content";
import { REGIONS, regionName } from "@/lib/regions";

/*
  Главная страница.

  Задача страницы одна: показать, что происходит в медиаполе страны, и дать
  сообщить о нарушении. Всё остальное на ней — путь к этим двум вещам.

  Все числа настоящие и приходят из базы. Ни одного оформительского
  показателя: если считать нечего, раздел не показывается.
*/

// Данные меняются от модерации, а не каждую секунду. Пересборка раз в
// пять минут снимает нагрузку с базы и не даёт странице устареть заметно.
export const revalidate = 300;

/** Цвет категории. Ключ — slug из базы. */
const TYPE_COLOR: Record<string, string> = {
  "hate-speech": "bg-hate",
  disinformation: "bg-disinfo",
  propaganda: "bg-propaganda",
  other: "bg-other",
};

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

async function getData() {
  const [byRegion, types, latest, news, newsCount, points] = await Promise.all([
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
    db.newsItem.findMany({ orderBy: { publishedAt: "desc" }, take: 5 }),
    db.newsItem.count(),
    // Точки для карты: только координаты и категория, ничего лишнего
    // в браузер не уезжает.
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

  return { byRegion, types, latest, news, newsCount, points };
}

export default async function HomePage() {
  const dict = getDictionary(DEFAULT_LANG);
  const lang = DEFAULT_LANG;
  const { byRegion, types, latest, news, newsCount, points } = await getData();

  const countByRegion = new Map(
    byRegion.map((row) => [row.regionCode, row._count._all]),
  );

  // Идём по списку областей, а не по результату запроса: область без
  // единой заявки обязана попасть в список с нулём, иначе карта соврёт.
  const regionData = REGIONS.map((region) => ({
    code: region.code,
    name: regionName(region.code, lang),
    count: countByRegion.get(region.code) ?? 0,
  })).sort((a, b) => b.count - a.count);

  const totalReports = regionData.reduce((sum, r) => sum + r.count, 0);
  const coveredRegions = regionData.filter((r) => r.count > 0).length;

  const stats = [
    { value: totalReports, label: dict.home.statReports },
    { value: coveredRegions, label: dict.home.statRegions },
    { value: types.length, label: dict.home.statTypes },
    { value: newsCount, label: dict.home.statNews },
  ];

  return (
    <>
      {/* --- Начало: заголовок и карта ---------------------------------- */}
      <section className="mx-auto max-w-[1400px] px-4 pt-12 pb-16 sm:px-6 lg:px-10 lg:pt-20">
        <p className="eyebrow">{dict.home.eyebrow}</p>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
          <h1 className="max-w-[16ch] text-3xl sm:text-4xl lg:text-5xl">
            {dict.home.heroTitle}
          </h1>

          <div className="max-w-prose">
            <p className="text-lg text-muted">{dict.home.heroSubtitle}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/report"
                className="inline-flex h-11 items-center gap-2 rounded-xs bg-signal px-5 text-sm font-medium text-surface transition-colors hover:bg-signal-deep"
              >
                {dict.home.heroPrimary}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/map"
                className="inline-flex h-11 items-center rounded-xs border border-border px-5 text-sm font-medium transition-colors hover:bg-surface"
              >
                {dict.home.heroSecondary}
              </Link>
            </div>
          </div>
        </div>

        {/* Девиз проекта. Моноширинный и разрядкой — как строка приборной
            панели, а не как лозунг на плакате. */}
        <p className="mt-10 font-mono text-2xs tracking-[0.18em] text-muted uppercase">
          {dict.slogan.part1} · {dict.slogan.part2} · {dict.slogan.part3}
        </p>

        <div className="mt-10 border-t border-line pt-10">
          <RegionPanel
            data={regionData}
            points={points.map((point) => ({
              id: point.id,
              lat: point.lat,
              lng: point.lng,
              typeSlug: point.violationType.slug,
            }))}
            legend={types.map((type) => ({
              slug: type.slug,
              name: lang === "ky" ? type.nameKy : type.nameRu,
            }))}
            title={dict.home.mapTitle}
            hint={dict.home.mapHint}
            unitLabel={dict.a11y.reportsIn}
          />
        </div>
      </section>

      {/* --- Показатели -------------------------------------------------- */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface px-4 py-7 sm:px-6">
              <p className="font-display text-3xl tabular-nums">{stat.value}</p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Категории нарушений ----------------------------------------- */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
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
          {types.map((type) => (
            <li key={type.slug} className="bg-paper">
              <Link
                href={`/categories/${type.slug}`}
                className="group flex h-full flex-col bg-surface p-6 transition-colors hover:bg-paper"
              >
                {/* Цвет категории — единственное, что её метит.
                    Иконок нет: четыре рисунка для четырёх абстракций
                    читаются хуже, чем четыре подписи. */}
                <span
                  className={`h-1 w-10 ${TYPE_COLOR[type.slug] ?? "bg-other"}`}
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lg group-hover:text-signal">
                  {lang === "ky" ? type.nameKy : type.nameRu}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted">
                  {lang === "ky" ? type.descKy : type.descRu}
                </p>
                <p className="mt-5 font-mono text-2xs text-muted">
                  {type._count.reports} {dict.home.statReports}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Последние заявки -------------------------------------------- */}
      {latest.length > 0 ? (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
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

            {/* Реестр, а не карточки: у заявки есть номер, тип, место и
                дата — это строка таблицы по своей природе. */}
            <ul className="mt-8 border-t border-line">
              {latest.map((report) => (
                <li key={report.id} className="border-b border-line">
                  <Link
                    href={`/map?report=${report.publicId}`}
                    className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 py-4 transition-colors hover:bg-paper sm:grid-cols-[7.5rem_1fr_auto_6rem]"
                  >
                    <span className="font-mono text-2xs text-muted">
                      {report.publicId}
                    </span>
                    <span className="text-sm">
                      {lang === "ky"
                        ? report.violationType.nameKy
                        : report.violationType.nameRu}
                    </span>
                    <span className="col-start-2 text-sm text-muted sm:col-start-auto">
                      {report.city}
                    </span>
                    <span className="col-start-2 font-mono text-2xs text-muted tabular-nums sm:col-start-auto sm:text-right">
                      {dateFormat.format(report.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* --- Агрегатор новостей ------------------------------------------ */}
      {news.length > 0 ? (
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
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

          <ul className="mt-8 border-t border-line">
            {news.map((item) => (
              <li key={item.id} className="border-b border-line">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1 py-4 transition-colors hover:bg-surface sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span className="order-2 flex-1 text-base group-hover:text-signal sm:order-none">
                    {item.title}
                    {/* Стрелка наружу: ссылка уводит на сторонний сайт,
                        и об этом честнее сказать заранее. */}
                    <ArrowUpRight
                      className="ml-1 inline h-3.5 w-3.5 align-baseline text-muted"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="order-1 font-mono text-2xs text-muted sm:order-none sm:w-40 sm:shrink-0 sm:text-right">
                    {item.source}
                  </span>
                  <span className="order-3 font-mono text-2xs text-muted tabular-nums sm:order-none sm:w-24 sm:shrink-0 sm:text-right">
                    {dateFormat.format(item.publishedAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --- Призыв подать заявку ---------------------------------------- */}
      <section className="bg-ink text-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="max-w-[20ch] text-2xl sm:text-3xl">
                {dict.home.ctaTitle}
              </h2>
              <p className="mt-4 max-w-prose text-surface/75">
                {dict.home.ctaBody}
              </p>
            </div>
            <Link
              href="/report"
              className="inline-flex h-12 items-center gap-2 justify-self-start rounded-xs bg-surface px-6 text-sm font-medium text-ink transition-colors hover:bg-paper"
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
