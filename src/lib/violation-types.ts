// Цвет вида нужен и в долях, и в карточках. Лежал в двух файлах — при
// добавлении вида пришлось бы вспоминать, где ещё такой же список.
// Ключ — slug из базы.

const COLORS: Record<string, string> = {
  "hate-speech": "bg-hate",
  disinformation: "bg-disinfo",
  "digital-fraud": "bg-propaganda",
};

const FALLBACK = "bg-other";

/** Класс фона для метки вида. Неизвестный вид получает нейтральный цвет. */
export const typeColor = (slug: string): string => COLORS[slug] ?? FALLBACK;
