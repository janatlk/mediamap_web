import { XMLParser } from "fast-xml-parser";

import { db } from "@/lib/db";
import { decodeEntities } from "@/lib/format";

/*
  Сборщик дайджеста: обходит ленты источников и складывает подходящие
  заметки в базу.

  Главное правило отбора задано проектом: заметка, не попавшая ни под одно
  ключевое слово, не сохраняется вовсе. Это осознанный размен — база
  остаётся маленькой и чистой, но при смене списка слов старое уже не
  вернуть, надо ждать новых публикаций. Об этом написано на странице
  настройки, чтобы решение не пришлось вспоминать по коду.

  Ключевые слова берутся по языку источника, а не по языку текста заметки.
  Определять язык по тексту заманчиво, но у заголовков он определяется
  плохо: три слова и имя собственное — слишком мало. Язык ленты известен
  точно, и его достаточно.
*/

/** Сколько ждать одну ленту. Дольше — источник считается недоступным. */
const FETCH_TIMEOUT_MS = 20_000;

/** Потолок размера ленты. Полный RSS крупного издания — сотни килобайт. */
const MAX_FEED_BYTES = 5 * 1024 * 1024;

/** Сколько заметок из одной ленты рассматривать за обход. */
const MAX_ITEMS_PER_FEED = 200;

/** Заметки старше этого срока не берём даже подходящие. */
const MAX_AGE_DAYS = 60;

const fold = (text: string) => text.toLowerCase().replace(/ё/g, "е");

/*
  Совпадение считаем от начала слова, а конец оставляем любым.

  Простое вхождение подстроки не годится: «СМИ» находилось внутри
  «Космической», и в дайджест приезжал указ о космической академии США.
  Полное совпадение слова тоже не годится — русский и кыргызский
  склоняются, и «мошенничеств» не нашло бы «мошенничества».

  Начало слова решает и то и другое: «сми» больше не сидит внутри
  «космической», а «мошенничеств» по-прежнему ловит все формы. Для
  словосочетаний («язык вражды») граница проверяется у первого слова.
*/
const boundary = new Map<string, RegExp>();

function pattern(word: string): RegExp {
  const folded = fold(word);
  const ready = boundary.get(folded);
  if (ready) return ready;

  const escaped = folded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Перед словом — не буква и не цифра (или начало строки).
  const made = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, "u");
  boundary.set(folded, made);
  return made;
}

/** Первое подошедшее слово или null. */
export function matchKeyword(text: string, keywords: string[]): string | null {
  const haystack = fold(text);
  return keywords.find((word) => pattern(word).test(haystack)) ?? null;
}

/*
  Разбор ленты.

  Разбираем настоящим XML-парсером, а не выражениями по тексту. RSS в живой
  природе кривой: CDATA, мнемоники, атрибуты со скобками, вложенные теги в
  описании — всё это регулярное выражение однажды разберёт неправильно и
  сделает это молча.
*/
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  // Заголовок из одних цифр («2026») иначе приезжает числом, и .trim() падает.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

export type FeedItem = {
  guid: string;
  title: string;
  link: string;
  snippet: string | null;
  publishedAt: Date;
};

/** Первое непустое строковое значение из возможных форм узла. */
function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = text(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const holder = value as Record<string, unknown>;
    // <title><![CDATA[…]]></title> приезжает как { "#text": "…" }
    return text(holder["#text"]);
  }
  return null;
}

/** Ссылка Atom живёт в атрибуте href, ссылка RSS — в теле тега. */
function link(node: unknown): string | null {
  const direct = text(node);
  if (direct) return direct;

  const candidates = Array.isArray(node) ? node : [node];
  for (const item of candidates) {
    if (item && typeof item === "object") {
      const holder = item as Record<string, unknown>;
      const rel = holder["@rel"];
      if (rel && rel !== "alternate") continue;
      const href = holder["@href"];
      if (typeof href === "string" && href.trim()) return href.trim();
    }
  }
  return null;
}

function when(...values: unknown[]): Date {
  for (const value of values) {
    const raw = text(value);
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }
  // Даты нет или она непонятная. Ставим сейчас, а не выбрасываем заметку:
  // ошибка в одном поле не повод потерять публикацию целиком.
  return new Date();
}

/** Снимает разметку из описания: в RSS туда кладут целые куски HTML. */
const plain = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

export function parseFeed(xml: string): FeedItem[] {
  const tree = parser.parse(xml) as Record<string, unknown>;

  const channel = (tree.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const feed = tree.feed as Record<string, unknown> | undefined;

  const raw = channel?.item ?? feed?.entry ?? [];
  const nodes = (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[];

  const items: FeedItem[] = [];
  for (const node of nodes.slice(0, MAX_ITEMS_PER_FEED)) {
    if (!node || typeof node !== "object") continue;

    const title = text(node.title);
    const href = link(node.link);
    if (!title || !href) continue;

    const описание = text(node.description) ?? text(node.summary);

    items.push({
      // guid — то, по чему узнаём уже собранное. Свой у ленты бывает не
      // всегда, тогда годится ссылка: она уникальна не хуже.
      guid: text(node.guid) ?? text(node.id) ?? href,
      title: decodeEntities(title),
      link: href,
      snippet: описание ? plain(описание) : null,
      publishedAt: when(node.pubDate, node.published, node.updated, node["dc:date"]),
    });
  }

  return items;
}

async function fetchFeed(url: string): Promise<string> {
  const stop = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: stop,
    headers: {
      // Без внятного User-Agent часть изданий отдаёт 403.
      "User-Agent": "MediaMapBot/1.0 (+https://mediamap.kg)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
    redirect: "follow",
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_FEED_BYTES) {
    throw new Error(`лента больше ${MAX_FEED_BYTES} байт`);
  }

  return new TextDecoder("utf-8").decode(body);
}

export type SourceReport = {
  sourceId: number;
  name: string;
  ok: boolean;
  found: number;
  kept: number;
  added: number;
  error: string | null;
};

export type CollectReport = {
  startedAt: Date;
  finishedAt: Date;
  sources: SourceReport[];
  added: number;
};

/** Ключевые слова по языкам — только включённые. */
async function loadKeywords(): Promise<Map<string, string[]>> {
  const rows = await db.newsKeyword.findMany({ where: { enabled: true } });
  const byLang = new Map<string, string[]>();
  for (const row of rows) {
    const list = byLang.get(row.lang) ?? [];
    list.push(row.word);
    byLang.set(row.lang, list);
  }
  return byLang;
}

/**
 * Обходит все включённые источники.
 *
 * Ошибка одного источника не останавливает остальные и не роняет обход: она
 * записывается в его строку и видна в панели. Лента отвалилась — это
 * нормальное событие, а не сбой сборщика.
 */
export async function collectNews(): Promise<CollectReport> {
  const startedAt = new Date();

  const [sources, keywords] = await Promise.all([
    db.newsSource.findMany({ where: { enabled: true }, orderBy: { id: "asc" } }),
    loadKeywords(),
  ]);

  const oldest = new Date(startedAt.getTime() - MAX_AGE_DAYS * 86_400_000);
  const reports: SourceReport[] = [];

  for (const source of sources) {
    const words = keywords.get(source.lang) ?? [];
    let found = 0;
    let kept = 0;
    let added = 0;
    let freshest: Date | null = null;
    let error: string | null = null;

    try {
      if (!source.takeAll && words.length === 0) {
        // Не молчим: без слов отбор не пропустит ничего, и лента будет
        // выглядеть сломанной, хотя сломана настройка.
        throw new Error(`нет ключевых слов для языка «${source.lang}»`);
      }

      const items = parseFeed(await fetchFeed(source.feedUrl));
      found = items.length;
      for (const item of items) {
        if (!freshest || item.publishedAt > freshest) freshest = item.publishedAt;
      }

      for (const item of items) {
        if (item.publishedAt < oldest) continue;

        /*
          Источник, помеченный «брать всё», проходит мимо отбора. Пишем в
          matched пометку, а не null: null означает «собрано до появления
          сборщика», и путать эти два случая нельзя.
        */
        const matched = source.takeAll
          ? "*"
          : matchKeyword(`${item.title} ${item.snippet ?? ""}`, words);
        if (!matched) continue;
        kept += 1;

        const fields = {
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          source: source.name,
          publishedAt: item.publishedAt,
          sourceId: source.id,
          lang: source.lang,
          matched,
        };

        // Уже собранное обновляем, а не плодим: издания правят заголовки.
        const before = await db.newsItem.findUnique({
          where: { guid: item.guid },
          select: { id: true },
        });
        await db.newsItem.upsert({
          where: { guid: item.guid },
          create: { guid: item.guid, ...fields },
          update: fields,
        });
        if (!before) added += 1;
      }
    } catch (cause) {
      // Короткий текст, а не трасса: в панели нужен вид сбоя.
      error = cause instanceof Error ? cause.message : String(cause);
    }

    await db.newsSource.update({
      where: { id: source.id },
      data: {
        lastRunAt: new Date(),
        lastStatus: error ? "error" : "ok",
        lastError: error,
        lastFound: error ? null : found,
        lastKept: error ? null : kept,
        lastItemAt: freshest,
      },
    });

    reports.push({
      sourceId: source.id,
      name: source.name,
      ok: !error,
      found,
      kept,
      added,
      error,
    });
  }

  return {
    startedAt,
    finishedAt: new Date(),
    sources: reports,
    added: reports.reduce((sum, item) => sum + item.added, 0),
  };
}
