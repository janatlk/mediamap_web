// Цвет вида нужен и в долях, и в карточках. Лежал в двух файлах — при
// добавлении вида пришлось бы вспоминать, где ещё такой же список.
// Ключ — slug из базы.

const COLORS: Record<string, string> = {
  "hate-speech": "bg-hate",
  disinformation: "bg-disinfo",
  "digital-fraud": "bg-fraud",
};

const FALLBACK = "bg-other";

/** Класс фона для метки вида. Неизвестный вид получает нейтральный цвет. */
export const typeColor = (slug: string): string => COLORS[slug] ?? FALLBACK;

// Полным словом, а не заменой bg- на border-: Tailwind находит классы в
// тексте исходников, собранный на лету класс он не увидит.
const BORDERS: Record<string, string> = {
  "hate-speech": "border-hate",
  disinformation: "border-disinfo",
  "digital-fraud": "border-fraud",
};

/** Класс рамки того же цвета — для плашки вердикта. */
export const typeBorder = (slug: string): string => BORDERS[slug] ?? "border-other";
