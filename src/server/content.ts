import { db } from "@/lib/db";
import { getDictionary, type Dictionary, type Lang } from "@/lib/i18n";

// Тексты сайта с правками администратора.
//
// Словарь в коде — основа, таблица site_texts — правки поверх неё. Такой
// порядок выбран намеренно: пустая база оставляет сайт со всеми словами на
// месте, а удалить правку значит вернуть исходный текст, а не получить
// дырку на странице.
//
// Ключ правки — путь в словаре: home.title, cases.lead. Массивы адресуются
// через индекс: home.steps.0.title.

/** Значение по пути. Возвращает undefined, если пути нет. */
function readPath(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
}

/** Записывает значение по пути. Молча пропускает, если пути нет. */
function writePath(target: unknown, path: string[], value: string): void {
  const parentPath = path.slice(0, -1);
  const key = path.at(-1);
  if (!key) return;

  const parent = readPath(target, parentPath);
  if (parent === null || typeof parent !== "object") return;

  const holder = parent as Record<string, unknown>;
  // Правим только то, что уже есть и является строкой: ключ мог остаться
  // от старой версии словаря, и заводить по нему новое поле незачем.
  if (typeof holder[key] !== "string") return;

  holder[key] = value;
}

/**
 * Словарь с наложенными правками.
 *
 * Вызывается на каждой странице вместо getDictionary. Запрос один и
 * лёгкий: строк правок столько, сколько администратор менял руками.
 */
export async function getContent(lang: Lang): Promise<Dictionary> {
  const base = getDictionary(lang);
  const rows = await db.siteText.findMany();

  if (rows.length === 0) return base;

  /*
    Правка берётся строго по языку страницы.

    Запасного варианта нет намеренно. Пока языков было два, здесь стояло
    «кыргызский — valueKy, иначе valueRu», и с появлением английского это
    молча означало «англичанину показать русский текст»: заголовок на
    /en был русским, потому что кто-то однажды поправил его в панели.
    Пусто — значит остаётся словарное значение своего языка.
  */
  const merged = structuredClone(base) as Dictionary;
  for (const row of rows) {
    const value =
      lang === "ky" ? row.valueKy : lang === "en" ? row.valueEn : row.valueRu;
    if (value) writePath(merged, row.key.split("."), value);
  }

  return merged;
}

export type TextEntry = {
  key: string;
  ru: string;
  ky: string;
  en: string;
  /** Значение из словаря — чтобы видеть, что правка изменила. */
  defaultRu: string;
  changed: boolean;
};

/** Собирает все строковые пути словаря: home.title, cases.lead и так далее. */
function collectPaths(source: unknown, prefix: string[] = []): string[] {
  if (typeof source === "string") return [prefix.join(".")];
  if (source === null || typeof source !== "object") return [];

  return Object.entries(source as Record<string, unknown>).flatMap(
    ([key, value]) => collectPaths(value, [...prefix, key]),
  );
}

/**
 * Все правимые тексты: ключ, текущее значение на трёх языках и признак
 * того, что его меняли. Для экрана редактирования.
 */
export async function listTexts(): Promise<TextEntry[]> {
  const [ru, ky, en] = [
    getDictionary("ru"),
    getDictionary("ky"),
    getDictionary("en"),
  ];
  const rows = await db.siteText.findMany();
  const overrides = new Map(rows.map((row) => [row.key, row]));

  return collectPaths(ru).map((key) => {
    const path = key.split(".");
    const defaultRu = String(readPath(ru, path) ?? "");
    const override = overrides.get(key);

    return {
      key,
      ru: override?.valueRu || defaultRu,
      ky: override?.valueKy || String(readPath(ky, path) ?? ""),
      en: override?.valueEn || String(readPath(en, path) ?? ""),
      defaultRu,
      changed: Boolean(override),
    };
  });
}
