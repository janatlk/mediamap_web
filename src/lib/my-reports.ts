// Список своих сообщений — в браузере, не на сервере.
//
// Мы не спрашиваем ни имени, ни почты, поэтому связать сообщения с
// человеком на сервере нечем и не нужно. Ключи лежат в localStorage: пока
// человек пользуется тем же браузером, он видит все свои сообщения.
//
// Ограничение честное и его надо проговаривать: другой браузер, другое
// устройство или очистка данных — и список пуст. Сами сообщения при этом
// никуда не деваются, теряется только способ их найти.

const STORAGE_KEY = "mm_my_reports";
const LIMIT = 50;

export type SavedReport = { token: string; publicId: string; savedAt: string };

const isBrowser = () => typeof window !== "undefined";

export function listSaved(): SavedReport[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is SavedReport =>
        typeof item?.token === "string" && typeof item?.publicId === "string",
    );
  } catch {
    // Данные могли испортиться или храниться от старой версии — не повод
    // ронять страницу.
    return [];
  }
}

export function remember(token: string, publicId: string): void {
  if (!isBrowser()) return;

  const saved = listSaved().filter((item) => item.token !== token);
  const next = [{ token, publicId, savedAt: new Date().toISOString() }, ...saved];

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, LIMIT)));
  } catch {
    // Приватный режим или переполненное хранилище — не беда, ссылка у
    // человека всё равно осталась в адресной строке.
  }
}

export function forgetAll(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
