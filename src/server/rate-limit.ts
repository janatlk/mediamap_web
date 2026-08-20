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
*/

const WINDOW_MS = 60 * 60 * 1000;
const MAX_IN_WINDOW = 5;

/** Соль живёт ровно столько, сколько процесс. Между запусками — новая. */
const SALT = createHash("sha256").update(String(Math.random())).digest("hex");

const hits = new Map<string, number[]>();

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

/** Выбрасывает из памяти всё, что старше окна. */
function recent(times: number[], now: number): number[] {
  return times.filter((time) => now - time < WINDOW_MS);
}

/**
 * Можно ли принять ещё одно сообщение с этого адреса.
 *
 * Считает попытку сразу: если вернули true, место в окне уже занято.
 * Возвращает и через сколько минут откроется следующее — человеку надо
 * сказать не «нельзя», а «нельзя до без четверти».
 */
export async function takeSubmitSlot(): Promise<
  { ok: true } | { ok: false; minutes: number }
> {
  const key = await callerFingerprint();
  const now = Date.now();
  const times = recent(hits.get(key) ?? [], now);

  if (times.length >= MAX_IN_WINDOW) {
    hits.set(key, times);
    const freesAt = times[0] + WINDOW_MS;
    return { ok: false, minutes: Math.max(1, Math.ceil((freesAt - now) / 60000)) };
  }

  hits.set(key, [...times, now]);
  return { ok: true };
}

/*
  Раз в час подчищаем карту. Без этого она растёт на каждый новый адрес и
  не уменьшается никогда: отправил человек однажды — и его отпечаток живёт
  в памяти до перезапуска.
*/
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, times] of hits) {
    const left = recent(times, now);
    if (left.length === 0) hits.delete(key);
    else hits.set(key, left);
  }
}, WINDOW_MS);

// Иначе процесс не завершится: таймер держит его открытым.
sweeper.unref?.();
