"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock, X } from "lucide-react";

import { forgetAll, listSaved } from "@/lib/my-reports";
import { violationText, type Dictionary, type Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import {
  loadAccountReports,
  loadMyReports,
  type MyReport,
} from "@/server/my-reports-actions";

// Список своих сообщений.
//
// Вошедшему список приходит из базы: сообщения привязаны к аккаунту и видны
// на любом устройстве. Остальным — по ключам из браузера, потому что на
// сервере связать сообщение с человеком нечем: имени и почты мы не просим.

type Props = { dict: Dictionary; lang: Lang; signedIn: boolean };

/** Состояние проверки: значком и словом, не только цветом. */
function Status({ report, dict }: { report: MyReport; dict: Dictionary }) {
  const words = dict.assessment;

  if (report.status === "APPROVED") {
    return (
      <span className="flex items-center gap-1.5 text-sm">
        <Check className="h-4 w-4 text-signal" aria-hidden="true" />
        {words.adminApproved}
      </span>
    );
  }

  if (report.status === "REJECTED") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted">
        <X className="h-4 w-4" aria-hidden="true" />
        {words.adminRejected}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-sm text-muted">
      <Clock className="h-4 w-4" aria-hidden="true" />
      {words.adminPending}
    </span>
  );
}

export default function MyReports({ dict, lang, signedIn }: Props) {
  const page = dict.myReports;
  const [reports, setReports] = useState<MyReport[] | null>(null);

  useEffect(() => {
    if (signedIn) {
      loadAccountReports().then(setReports);
      return;
    }

    const saved = listSaved();
    if (saved.length === 0) {
      setReports([]);
      return;
    }
    loadMyReports(saved.map((item) => item.token)).then(setReports);
  }, [signedIn]);

  // Пока не прочитали хранилище, не показываем ни списка, ни «пусто»:
  // мигающее «сообщений нет» пугает сильнее ожидания.
  if (reports === null) return null;

  if (reports.length === 0) {
    return (
      <div className="mt-10">
        <p className="text-muted">{page.empty}</p>
        <Link
          href={`/${lang}/report`}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
        >
          {page.emptyAction}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const date = (value: string) =>
    new Intl.DateTimeFormat(lang === "ky" ? "ky-KG" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Bishkek",
    }).format(new Date(value));

  return (
    <>
      <ul className="mt-10 border-t border-line">
        {reports.map((report) => (
          <li key={report.token} className="border-b border-line py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-base">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${typeColor(report.typeSlug)}`}
                  aria-hidden="true"
                />
                {violationText(dict, report.typeSlug)?.name ?? report.typeSlug}
              </span>

              <Status report={report} dict={dict} />

              <span className="font-mono text-2xs text-muted">
                {report.publicId}
              </span>
            </div>

            <p className="mt-1 text-sm text-muted">
              {page.submitted}: {date(report.createdAt)}
              {report.reviewedAt
                ? ` · ${page.reviewed}: ${date(report.reviewedAt)}`
                : ""}
            </p>

            {/* Заметку проверяющего показываем: человек вправе знать, почему
                решили именно так. */}
            {report.moderatorNote ? (
              <p className="mt-2 max-w-prose border-l-2 border-line pl-4 text-sm">
                <span className="text-muted">{page.note}: </span>
                {report.moderatorNote}
              </p>
            ) : null}

            <Link
              href={`/${lang}/report/sent/${report.token}`}
              className="mt-2 inline-flex min-h-9 items-center gap-1.5 py-1 text-sm text-signal hover:underline"
            >
              {page.open}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      {signedIn ? null : (
      <div className="mt-8">
        <button
          type="button"
          onClick={() => {
            forgetAll();
            setReports([]);
          }}
          className="inline-flex h-10 items-center rounded-xs border border-border px-4 text-sm transition-colors hover:bg-surface"
        >
          {page.forget}
        </button>
        <p className="mt-2 max-w-prose text-sm text-muted">{page.forgetHint}</p>
      </div>
      )}
    </>
  );
}
