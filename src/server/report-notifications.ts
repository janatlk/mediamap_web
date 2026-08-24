import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { DEFAULT_LANG } from "@/lib/i18n";
import { sendMail } from "./mail";

/*
  Извещение заявителю о решении по его сообщению.

  Кому пишем: только тем, кто завёл аккаунт, оставил почту и не отказался от
  писем. Анонимных большинство, и почты у них нет по устройству сайта — они
  узнают решение, открыв свою ссылку.

  Когда пишем: когда решение действительно поменялось. Проверяющий правит
  заголовок или заметку по нескольку раз, и слать письмо на каждое нажатие
  «Сохранить» значило бы наказывать человека за нашу аккуратность.
*/

/** Что изменилось в решении. Пусто — писать не о чем. */
export type Change = {
  statusChanged: boolean;
  commentChanged: boolean;
};

export function whatChanged(
  before: { status: string; moderatorComment: string | null },
  after: { status: string; moderatorComment: string | null },
): Change {
  return {
    statusChanged: before.status !== after.status,
    commentChanged: (before.moderatorComment ?? "") !== (after.moderatorComment ?? ""),
  };
}

const SUBJECT: Record<string, string> = {
  [REPORT_STATUS.APPROVED]: "Ваше сообщение подтверждено",
  [REPORT_STATUS.REJECTED]: "По вашему сообщению принято решение",
  [REPORT_STATUS.PENDING]: "Ваше сообщение вернули на проверку",
};

const OUTCOME: Record<string, string> = {
  [REPORT_STATUS.APPROVED]:
    "Проверяющий подтвердил нарушение. Случай опубликован в базе.",
  [REPORT_STATUS.REJECTED]:
    "Проверяющий не подтвердил нарушение. Это не значит, что вы ошиблись — " +
    "чаще всего не хватает того, что можно проверить.",
  [REPORT_STATUS.PENDING]:
    "Сообщение вернули в очередь: решение пересматривают.",
};

/**
 * Пишет заявителю, если он этого хотел.
 *
 * Ничего не бросает и ничего не ждёт от почты: решение модератора уже
 * записано, и письмо на него не влияет.
 */
export async function notifyReporter(reportId: number, change: Change): Promise<void> {
  if (!change.statusChanged && !change.commentChanged) return;

  const report = await db.report.findUnique({
    where: { id: reportId },
    select: {
      publicId: true,
      status: true,
      moderatorComment: true,
      receiptToken: true,
      author: { select: { email: true, notifyByEmail: true } },
    },
  });

  const author = report?.author;
  if (!report || !author?.email || !author.notifyByEmail) return;

  const site = process.env.SITE_URL?.replace(/\/$/, "") ?? "";
  const link = report.receiptToken
    ? `${site}/${DEFAULT_LANG}/report/sent/${report.receiptToken}`
    : "";

  const lines = [
    `Сообщение ${report.publicId}.`,
    "",
    OUTCOME[report.status] ?? "По вашему сообщению принято решение.",
  ];

  if (report.moderatorComment) {
    lines.push("", `Что ответил проверяющий: ${report.moderatorComment}`);
  }

  if (link) {
    lines.push("", `Подробности: ${link}`);
  }

  // Как перестать получать письма — в самом письме. Искать эту настройку по
  // сайту человек не должен.
  lines.push(
    "",
    "Это письмо о вашем собственном сообщении. Отключить такие письма можно " +
      "в профиле на сайте.",
  );

  await sendMail({
    to: author.email,
    subject: `${SUBJECT[report.status] ?? "Решение по сообщению"} · ${report.publicId}`,
    text: lines.join("\n"),
  });
}
