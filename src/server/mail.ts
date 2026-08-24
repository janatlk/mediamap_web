import nodemailer, { type Transporter } from "nodemailer";

/*
  Отправка почты.

  Единственное, что мы шлём, — извещение человеку о его собственной заявке.
  Ни рассылок, ни новостей: почта у нас есть только у тех, кто завёл аккаунт,
  и просили они не этого.

  Без настроек почта не уходит, и это нормальное состояние, а не поломка.
  Пока в окружении нет SMTP_HOST, письма просто не отправляются, а в журнал
  ложится строчка. Валить решение модератора из-за неотправленного письма
  нельзя: решение уже принято и записано, письмо — дело десятое.
*/

type Letter = {
  to: string;
  subject: string;
  text: string;
};

/** Настроена ли почта. Без этого письма молча не уходят. */
export function mailReady(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

/*
  Соединение держим одно на процесс: nodemailer сам поддерживает пул, а
  создавать транспорт на каждое письмо — это новый TCP и новый вход по
  паролю на каждое решение модератора.
*/
let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport) return transport;

  const port = Number(process.env.SMTP_PORT ?? 587);

  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 — это TLS с первого байта, остальные порты начинают открыто и
    // поднимают TLS через STARTTLS. Перепутать значит не соединиться вовсе.
    secure: port === 465,
    // Вход по паролю — только если пароль задан. Внутренний ретранслятор в
    // своей сети его не спрашивает, а nodemailer с пустым паролем всё равно
    // отправит AUTH и получит отказ.
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    pool: true,
  });

  return transport;
}

/**
 * Отправляет письмо. Возвращает, ушло ли.
 *
 * Не бросает никогда. Вызывают её из действий модератора, и падение почты не
 * должно выглядеть как несработавшая кнопка «Подтвердить».
 */
export async function sendMail(letter: Letter): Promise<boolean> {
  if (!mailReady()) {
    console.info("почта не настроена — письмо не отправлено:", letter.subject);
    return false;
  }

  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to: letter.to,
      subject: letter.subject,
      text: letter.text,
    });
    return true;
  } catch (error) {
    console.error("письмо не ушло:", error);
    return false;
  }
}
