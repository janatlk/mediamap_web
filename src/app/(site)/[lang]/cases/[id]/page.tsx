import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  TriangleAlert,
} from "lucide-react";

import { formatDate } from "@/lib/format";
import { isReadyLanguage, violationText } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { typeBorder, typeColor } from "@/lib/violation-types";
import AssessmentCard from "@/components/report/AssessmentCard";
import Translated from "@/components/report/Translated";
import Attachments from "@/components/report/Attachments";
import { loadCase } from "@/server/case-data";
import type { Verdict } from "@/server/ai-review";

// Страница одного случая. Открывается по публичному номеру — тому, что
// человек называет по телефону, а не по внутреннему id.

export const revalidate = 300;

type Params = { lang: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isReadyLanguage(lang)) return {};

  const dict = await getContent(lang);
  const item = await loadCase(id, lang);
  if (!item) return { title: dict.cases.notFound };

  return {
    title: `${item.headline ?? violationText(dict, item.typeSlug)?.name ?? item.typeSlug} · ${item.publicId}`,
    description: dict.cases.detailLead,
  };
}

/** Пара «подпись — значение». Их на странице несколько, вид у всех один. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-base">{children}</dd>
    </div>
  );
}

export default async function CasePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang, id } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  // Без языка: тексты переводит Translated, ему нужен оригинал. Переданный
  // перевод он принял бы за новый текст и перевёл ещё раз.
  const item = await loadCase(id);

  // Не 404, а объяснение: номер могли продиктовать с ошибкой, и человеку
  // полезнее понять, что случилось, чем упереться в системную страницу.
  if (!item) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <h1 className="text-3xl">{dict.cases.notFound}</h1>
        <p className="mt-4 max-w-prose text-muted">{dict.cases.notFoundLead}</p>
        <Link
          href={`/${lang}/cases`}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {dict.cases.backToList}
        </Link>
      </div>
    );
  }

  const typeName = violationText(dict, item.typeSlug)?.name ?? item.typeSlug;
  const words = dict.cases;
  const warning =
    words.quoteWarning[item.typeSlug as keyof typeof words.quoteWarning] ??
    words.quoteWarning.other;
  /*
    «Почему» под вердиктом. Заметка проверяющего — слово редакции, она
    главнее; нет её — начало разбора модели, целиком он ниже.
  */
  const why = item.moderatorComment ?? item.ai?.explanation ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      {/* Крошки вместо одной ссылки «назад»: видно и раздел, и вид, и по
          виду можно перейти к таким же случаям. */}
      <nav aria-label={words.breadcrumbs} className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 text-muted">
          <li>
            <Link
              href={`/${lang}/cases`}
              className="inline-flex min-h-11 items-center text-signal hover:underline"
            >
              {dict.nav.cases}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/${lang}/cases?type=${item.typeSlug}`}
              className="inline-flex min-h-11 items-center text-signal hover:underline"
            >
              {typeName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-mono">
            {item.publicId}
          </li>
        </ol>
      </nav>

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
      <div className="max-w-3xl">
        {/* Заголовок говорит, что произошло. Раньше здесь стояло название вида,
            и у всех случаев одного вида страница называлась одинаково. */}
        <h1 className="text-3xl sm:text-4xl">
          {item.headline ? (
            <Translated text={item.headline} lang={lang} lines={1} />
          ) : (
            typeName
          )}
        </h1>

        {/*
          Вердикт — сразу под заголовком, раньше самого текста.

          Прежде он стоял на полтора экрана ниже, после полного пересказа
          сообщения. Страница о фейке сначала пересказывала фейк, и тот, кто
          дальше не долистал, уносил с неё именно его.
        */}
        <section
          aria-labelledby="verdict"
          className={`mt-8 border-l-4 bg-surface px-5 py-5 sm:px-6 ${typeBorder(item.typeSlug)}`}
        >
          <p className="text-sm text-muted">{words.verdictLabel}</p>
          <p id="verdict" className="mt-1 flex items-center gap-2 text-2xl">
            <span
              className={`h-3 w-3 shrink-0 rounded-full ${typeColor(item.typeSlug)}`}
              aria-hidden="true"
            />
            {typeName}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Check className="h-4 w-4 text-signal" aria-hidden="true" />
            {words.verdictConfirmed}
          </p>

          {why ? (
            <p className="mt-4 line-clamp-4 max-w-prose text-base">
              <Translated text={why} lang={lang} lines={3} />
            </p>
          ) : null}
          {item.ai ? (
            <a
              href="#analysis"
              className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm text-signal hover:underline"
            >
              {words.readAnalysis}
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </section>

        {/*
          Текст заявителя — под катом и с пометкой, что в нём. Пересказ
          нарушения нужен как доказательство, но не как первое, что читают.
          Пусто — блока нет: подпись без содержимого выглядит недоделкой.
        */}
        {item.authorComment ? (
          <section className="mt-10">
            <h2 className="text-sm text-muted">{words.fromAuthor}</h2>
            <details className="group mt-3 border border-line bg-surface">
              <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <TriangleAlert
                  className="mt-0.5 h-5 w-5 shrink-0 text-trust-mid"
                  aria-hidden="true"
                />
                <span className="flex-1">
                  <span className="block text-base">{warning}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm text-signal group-open:hidden">
                    {words.quoteShow}
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </span>
              </summary>
              <blockquote className="border-t border-line px-5 py-4 text-base whitespace-pre-line text-muted">
                {item.authorComment}
              </blockquote>
            </details>
          </section>
        ) : null}

        {/*
          Приложенное — только то, что проверяющий открыл поимённо. Токена
          здесь нет и быть не может: страница публичная, а личный ключ на
          то и личный. Список пуст — блока просто нет.
        */}
        <Attachments items={item.attachments} title={words.attachments} />

        {/*
          Разбор модели — подробности к вердикту выше. Заметку проверяющего
          в карточку не передаём: она уже стоит в плашке вердикта.
        */}
        {item.ai ? (
          <div id="analysis" className="scroll-mt-24">
            <AssessmentCard
              dict={dict}
              lang={lang}
              audience="public"
              status="APPROVED"
              chosenType={item.typeSlug}
              checks={item.ai.checks}
              reviewed
              terminology={item.terminology}
              basis={item.basis}
              hasLink={Boolean(item.link)}
              assessment={{
                verdict: item.ai.verdict as Verdict,
                confidence: item.ai.confidence,
                explanation: item.ai.explanation,
                reasons: item.ai.reasons,
                source: item.ai.source,
              }}
            />

            {/* Кто и когда это писал. Без строки карточка читается как часть
                решения редакции, а она — то, что ответила машина. */}
            <p className="mt-3 max-w-prose text-sm text-muted">
              {dict.assessment.publicNote}
            </p>
          </div>
        ) : null}
      </div>

      {/*
        Служебное — номер, даты, площадка — в боковой колонке. На телефоне
        она уходит вниз: сначала ответ, потом реквизиты.
      */}
      <aside className="mt-12 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
        <h2 className="eyebrow">{words.details}</h2>
        <dl className="mt-3">
          <Field label={words.number}>
            <span className="font-mono">{item.publicId}</span>
          </Field>

          {/* Когда произошло — раньше, чем когда проверили: читателю важнее
              возраст случая, чем наша дата разбора. У сообщений, поданных до
              появления поля, даты нет, и строки тоже нет. */}
          {item.happenedAt ? (
            <Field label={dict.cases.happenedAt}>
              <span className="tabular-nums">
                {formatDate(item.happenedAt, lang)}
              </span>
            </Field>
          ) : null}

          <Field label={dict.cases.checkedAt}>
            <span className="tabular-nums">
              {formatDate(item.checkedAt, lang)}
            </span>
          </Field>

          {/* Поле «где опубликовано» показываем, только если есть что показать.
              Раньше при отсутствии ссылки и города оставалась строка
              «площадка не указана» — подпись без содержимого. */}
          {item.link || item.city ? (
          <Field label={dict.cases.where}>
            {item.link ? (
              <>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-signal hover:underline"
                >
                  {item.source ?? item.link}
                  <ArrowUpRight
                    className="ml-1 inline h-4 w-4 align-baseline"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{dict.a11y.externalLink}</span>
                </a>
                {/* Публикацию могли снести после проверки — предупреждаем,
                    чтобы ссылка в никуда не выглядела нашей недоработкой. */}
                <p className="mt-2 text-sm text-muted">{dict.cases.linkGone}</p>
              </>
            ) : null}

            {item.city ? (
              <p className="mt-1 text-sm text-muted">{item.city}</p>
            ) : null}
          </Field>
          ) : null}
        </dl>
      </aside>
      </div>
    </div>
  );
}
