/*
  Скачивание ролика по ссылке через свой инстанс Cobalt.

  Instagram, TikTok и Facebook не отдают видео обычным запросом, а YouTube
  отдаёт так, что без отдельного разбора не обойтись. Cobalt умеет и то и
  другое: ему дают ссылку на пост, он возвращает прямую ссылку на файл.

  Тот же инстанс давно используется ML-сервисом при разборе сообщений — см.
  src/mediamap_ml/sources/cobalt.py в соседнем репозитории. Здесь только
  скачивание ролика для показа на сайте, и просим мы не звук, а видео.

  Адрес инстанса и ключ наружу не отдаём ни в каком виде: редактору
  показываем «сервис не ответил», а подробности уходят в журнал сервера.
*/

import { VIDEO_MAX_BYTES, VIDEO_TYPES } from "@/lib/video-rules";

export type Fetched = { data: Buffer; mime: string; title: string | null };

export class LinkError extends Error {}

/*
  Качество. 720 для вертикального ролика из соцсети — это считанные
  мегабайты, а для ролика с YouTube уже заметно: минута весит около
  двадцати. Поэтому при отказе по размеру пробуем ещё раз в 480.
*/
const QUALITIES = ["720", "480"];

/** Сколько ждём ответа: Cobalt сам ходит в соцсеть, это не мгновенно. */
const TIMEOUT_MS = 90_000;

export function cobaltReady(): boolean {
  return Boolean(process.env.COBALT_URL && process.env.COBALT_KEY);
}

/** Скачивает ролик по ссылке на пост. Бросает LinkError с понятной причиной. */
export async function fetchVideo(link: string): Promise<Fetched> {
  if (!cobaltReady()) {
    throw new LinkError(
      "Загрузка по ссылке не настроена: в .env нет COBALT_URL и COBALT_KEY",
    );
  }

  let tooBig = false;

  for (const quality of QUALITIES) {
    const media = await resolve(link, quality);
    const file = await download(media.url);

    if (file === "too-big") {
      tooBig = true;
      continue;
    }

    return { ...file, title: media.title };
  }

  throw new LinkError(
    tooBig
      ? `Ролик больше ${Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} МБ даже в среднем качестве. Такой длинный ролик лучше нарезать.`
      : "Скачать ролик не вышло",
  );
}

/** Спрашивает у Cobalt прямую ссылку на файл. */
async function resolve(
  link: string,
  quality: string,
): Promise<{ url: string; title: string | null }> {
  let answer: Record<string, unknown>;

  try {
    const response = await fetch(String(process.env.COBALT_URL), {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${process.env.COBALT_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ url: link, videoQuality: quality }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    answer = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("cobalt не ответил:", error);
    throw new LinkError("Сервис разбора ссылок не ответил. Попробуйте позже");
  }

  const status = String(answer.status ?? "");

  if (status === "tunnel" || status === "redirect" || status === "local-processing") {
    return {
      url: String(answer.url ?? ""),
      title: typeof answer.filename === "string" ? cleanTitle(answer.filename) : null,
    };
  }

  /*
    picker — в посте несколько файлов. Берём первое видео: пост с каруселью
    из десяти картинок роликом не является, а выбор «какой именно» редактор
    и так сделает, дав ссылку точнее.
  */
  if (status === "picker" && Array.isArray(answer.picker)) {
    const first = (answer.picker as { type?: string; url?: string }[]).find(
      (item) => item.type === "video" || !item.type,
    );
    if (first?.url) return { url: first.url, title: null };
    throw new LinkError("По этой ссылке видео нет, только картинки");
  }

  const reason = String(
    (answer.error as { code?: string } | undefined)?.code ?? status ?? "",
  );
  console.error("cobalt отказал:", reason);

  if (reason.includes("private") || reason.includes("auth")) {
    throw new LinkError("Пост закрытый: скачать его нельзя");
  }
  if (reason.includes("unsupported") || reason.includes("invalid")) {
    throw new LinkError("Такие ссылки сервис не открывает");
  }
  throw new LinkError("Ссылка не открылась: пост удалён или недоступен");
}

/** Качает файл, обрывая слишком большой, чтобы не тянуть гигабайт впустую. */
async function download(
  url: string,
): Promise<{ data: Buffer; mime: string } | "too-big"> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(
    (error) => {
      console.error("файл по ссылке не скачался:", error);
      throw new LinkError("Файл не скачался. Попробуйте ещё раз");
    },
  );

  if (!response.ok || !response.body) {
    throw new LinkError(`Файл не скачался: сервис ответил ${response.status}`);
  }

  const parts: Buffer[] = [];
  let size = 0;

  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size > VIDEO_MAX_BYTES) return "too-big";
    parts.push(Buffer.from(chunk));
  }

  const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  // Cobalt отдаёт mp4; тип на всякий случай приводим к известному нам.
  return { data: Buffer.concat(parts), mime: mime in VIDEO_TYPES ? mime : "video/mp4" };
}

/** Из имени файла Cobalt делаем черновик названия: редактор его поправит. */
function cleanTitle(filename: string): string | null {
  const name = filename.replace(/\.[a-z0-9]{2,4}$/i, "").trim();
  return name.length > 2 ? name.slice(0, 120) : null;
}
