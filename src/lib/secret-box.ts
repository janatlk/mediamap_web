import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/*
  Хранение чужих ключей доступа.

  Ключи от сторонних сервисов вводит администратор через панель, а значит
  они ложатся в базу. Открытым текстом класть их нельзя: файл базы уезжает
  в резервную копию, копия — на чужой диск, и один потерянный архив
  означает счёт за чужие запросы. Шифруем.

  AES-256-GCM: шифрует и одновременно подписывает. Подменённую или битую
  запись расшифровать не выйдет — она честно упадёт, а не вернёт мусор,
  который потом уйдёт в заголовок запроса.

  Ключ шифрования живёт в SECRETS_KEY, то есть в .env рядом с базой, а не в
  ней самой. Это не идеал — тот, кто добрался до сервера, получит и то и
  другое, — но от утечки одной лишь резервной копии защищает, а именно так
  базы и утекают.

  Смена SECRETS_KEY делает сохранённые ключи нечитаемыми. Это не поломка, а
  ровно то, что должно происходить: сохранённое старым ключом новым не
  открывается. Панель в таком случае покажет «ключ не расшифровывается» и
  предложит ввести заново.
*/

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class NoSecretsKey extends Error {
  constructor() {
    super(
      "SECRETS_KEY не задан. Без него ключи сторонних сервисов негде " +
        "хранить: класть их в базу открытым текстом нельзя. " +
        "Сгенерировать: openssl rand -hex 32",
    );
    this.name = "NoSecretsKey";
  }
}

export const secretsKeyReady = (): boolean =>
  (process.env.SECRETS_KEY ?? "").length >= 32;

/*
  Из строки в 32 байта.

  Через SHA-256, а не срезом строки: администратор впишет туда что угодно —
  и шестнадцатеричные 64 знака, и парольную фразу. Хеш принимает любое и
  всегда отдаёт нужную длину.
*/
function key(): Buffer {
  const raw = process.env.SECRETS_KEY ?? "";
  if (raw.length < 32) throw new NoSecretsKey();
  return createHash("sha256").update(raw).digest();
}

/** Шифрует. Возвращает одну строку: iv.tag.data, всё в base64url. */
export function seal(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, data].map((part) => part.toString("base64url")).join(".");
}

/** Расшифровывает. Бросает, если запись битая, подменённая или от другого ключа. */
export function open(sealed: string): string {
  const parts = sealed.split(".");
  if (parts.length !== 3) throw new Error("запись повреждена");

  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("запись повреждена");
  }

  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/**
 * Хвост ключа для показа: «…a3f9».
 *
 * Полный ключ обратно в панель не отдаём никогда: показанное однажды
 * попадает в снимок экрана, в историю браузера и в чужие глаза за плечом.
 * Хвоста достаточно, чтобы узнать, тот ли ключ вписан.
 */
export const tail = (value: string, keep = 4): string =>
  value.length <= keep ? "…" : `…${value.slice(-keep)}`;
