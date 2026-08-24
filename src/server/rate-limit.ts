import { createHash } from "node:crypto";
import { headers } from "next/headers";

/*
  Ограничение частоты отправки.

  Считаем в памяти, а не в базе, и держим не адрес, а его отпечаток.
  Причина не в экономии: сайт обещает анонимность, а таблица «кто и когда
  отправлял» — это журнал обращений с привязкой к адресу. Отпечаток
  односторонний, соль своя у каждого запуска, и после перезапуска связь с
  адресом восстановить нельзя даже нам.

  Чем это платим: счётчик обнуляется при перезапуске, и на нескольких
  копиях приложения у каждой он свой. Для защиты от человека, который в
  сердцах жмёт кнопку двадцать раз, этого хватает. Против настоящего
  напора нужен общий счётчик — Redis или та же защита у входа на сервер.

  Пауза растёт постепенно. Раньше первое же превышение закрывало отправку
  почти на час — а человек, который увидел три нарушения подряд и написал о
  каждом, ничего дурного не делал и оказывался наказан наравне со спамером.
  Теперь первая пауза короткая, чтобы просто сбить темп, и только упорство
  подряд стоит по-настоящему.

  Второй заход по той же грабле был тоньше. «Серия» считалась в окне памяти,
  то есть за целый час: три сообщения за час — и человек упирался в паузу,
  шесть — и получал пятнадцать минут. Слово «подряд» в коде означало совсем
  не то, что значит для человека. Окно серии теперь своё и короткое, а память
  о паузах живёт отдельно и сама затухает.
*/

/** Сколько сообщений подряд пропускаем, прежде чем притормозить. */
const BURST = 5;

/**
 * В каком окне считается «подряд».
 *
 * Пять сообщений за пять минут — это человек, который жмёт кнопку, а не
 * рассказывает о пяти разных случаях: на каждое нужно написать пару абзацев.
 * Растянутые по часу пять сообщений — обычная работа, и трогать её нельзя.
 */
const BURST_WINDOW_MS = 5 * 60 * 1000;

/** Пауза растёт: сбить темп → настойчивому → упорному. */
const PAUSES_MS = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000];

/** Сколько помним о человеке после последней отправки. */
const MEMORY_MS = 60 * 60 * 1000;

/**
 * Через сколько тишины прощаем прошлые паузы.
 *
 * Без этого счётчик рос до конца часа: один раз попавшись утром, человек
 * получал следующую паузу сразу длинной, хотя вёл себя нормально уже
 * полчаса. Наказание должно кончаться вместе с поводом.
 */
const FORGIVE_MS = 15 * 60 * 1000;

/** Соль живёт ровно столько, сколько процесс. Между запусками — новая. */
const SALT = createHash("sha256").update(String(Math.random())).digest("hex");

export type Record = {
  /** Время отправок, попавших в текущую серию. */
  times: number[];
  /** Сколько раз этот отправитель уже упирался в ограничение. */
  pauses: number;
  /** Когда упёрся в последний раз — по нему паузы и прощаются. */
  lastPauseAt: number;
  /** До какого момента отправка закрыта. */
  blockedUntil: number;
};

const hits = new Map<string, Record>();

/**
 * Адрес отправителя.
 *
 * За обратным прокси настоящий адрес приходит в заголовке. Заголовок
 * подделывается, но подделать его может только тот, кто и так уже внутри:
 * снаружи его перезапишет прокси.
 */
async function callerFingerprint(): Promise<string> {
  const head = await headers();
  const address =
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    head.get("x-real-ip") ??
    "unknown";
  return createHash("sha256").update(SALT).update(address).digest("hex");
}

export const fresh = (): Record => ({
  times: [],
  pauses: 0,
  lastPauseAt: 0,
  blockedUntil: 0,
});

/**
 * Можно ли принять ещё одно сообщение с этого адреса.
 *
 * Считает попытку сразу: если вернули true, место в серии уже занято.
 * Возвращает и сколько ждать — человеку надо сказать не «нельзя», а
 * «нельзя ещё полминуты».
 */
export async function takeSubmitSlot(): Promise<Decision> {
  const key = await callerFingerprint();
  const now = Date.now();

  const { decision, next } = decide(hits.get(key) ?? fresh(), now);
  hits.set(key, next);
  return decision;
}

export type Decision = { ok: true } | { ok: false; seconds: number };

/**
 * Само решение — отдельно от адресов, времени и карты в памяти.
 *
 * Вынесено не ради красоты: в этом расчёте уже дважды пряталась ошибка,
 * которую не увидеть, не проиграв десяток отправок по часам. Чистой функции
 * можно подсунуть любое «сейчас» и проверить всю лестницу за миллисекунду.
 */
export function decide(
  record: Record,
  now: number,
): { decision: Decision; next: Record } {
  if (now < record.blockedUntil) {
    return {
      decision: { ok: false, seconds: Math.ceil((record.blockedUntil - now) / 1000) },
      next: record,
    };
  }

  // Серия — только недавние отправки. Всё, что старше окна, к «подряд»
  // отношения не имеет и на счёт не идёт.
  const times = record.times.filter((time) => now - time < BURST_WINDOW_MS);

  // Вёл себя прилично достаточно долго — прошлые паузы прощаются.
  const pauses =
    record.lastPauseAt && now - record.lastPauseAt > FORGIVE_MS ? 0 : record.pauses;

  if (times.length >= BURST) {
    const step = Math.min(pauses, PAUSES_MS.length - 1);
    const wait = PAUSES_MS[step];

    return {
      decision: { ok: false, seconds: Math.ceil(wait / 1000) },
      next: { times: [], pauses: pauses + 1, lastPauseAt: now, blockedUntil: now + wait },
    };
  }

  return {
    decision: { ok: true },
    next: { ...record, pauses, times: [...times, now] },
  };
}

/*
  Раз в час подчищаем карту. Без этого она растёт на каждый новый адрес и
  не уменьшается никогда: отправил человек однажды — и его отпечаток живёт
  в памяти до перезапуска.
*/
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of hits) {
    const times = record.times.filter((time) => now - time < BURST_WINDOW_MS);
    const stale = now - Math.max(record.lastPauseAt, ...record.times, 0) > MEMORY_MS;
    if (times.length === 0 && now > record.blockedUntil && stale) hits.delete(key);
    else hits.set(key, { ...record, times });
  }
}, MEMORY_MS);

// Иначе процесс не завершится: таймер держит его открытым.
sweeper.unref?.();
