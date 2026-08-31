# -*- coding: utf-8 -*-
"""Проверяет пары «текст на фоне» по WCAG 2.1.

На прежнем сайте двадцать пар не добирали до нормы, причём серый
rgb(110,121,121) промахивался на сотую долю — глазом такое не поймать.
Поэтому палитра проверяется числами до того, как попадёт в стили.

Норма AA: 4.5 для обычного текста, 3.0 для крупного (от 18.66px жирного
или 24px обычного) и для границ элементов управления.

Запуск: python scripts/check-contrast.py
"""

PALETTE = {
    "paper":       "#F2F4F3",
    "surface":     "#FFFFFF",
    "ink":         "#101615",
    "display":     "#2B3735",
    "muted":       "#59635F",
    "line":        "#D5DCD9",
    "border":      "#848D8A",
    "signal":      "#B3122A",
    "hate":        "#5A3E85",
    "disinfo":     "#1F5673",
    "fraud":       "#8A5710",
    "other":       "#4F5956",
}

# (текст, фон, требуемый минимум, где применяется)
PAIRS = [
    ("ink",        "paper",   4.5, "основной текст"),
    ("display",    "paper",   4.5, "заголовки на бумаге"),
    ("display",    "surface", 4.5, "заголовки на карточке"),
    ("ink",        "surface", 4.5, "текст в карточке"),
    ("muted",      "paper",   4.5, "подписи и метаданные"),
    ("muted",      "surface", 4.5, "метаданные в карточке"),
    ("signal",     "paper",   4.5, "ссылки и действия"),
    ("signal",     "surface", 4.5, "ссылки в карточке"),
    ("hate",       "surface", 4.5, "вид: язык вражды"),
    ("disinfo",    "surface", 4.5, "вид: дезинформация"),
    ("fraud",      "surface", 4.5, "вид: цифровое мошенничество"),
    ("other",      "surface", 4.5, "нейтральный вид"),
    ("surface",    "signal",  4.5, "белый текст на кнопке"),
    ("surface",    "ink",     4.5, "белый текст на тёмном"),
    ("border",     "paper",   3.0, "рамки полей и кнопок"),
    ("border",     "surface", 3.0, "рамки полей в карточке"),
]

# `line` сюда намеренно не входит. Это волосяной разделитель между блоками:
# критерий 1.4.11 распространяется на границы элементов управления и на
# графику, несущую смысл, а декоративная линейка под требование не подпадает.
# Всё, что можно нажать, обязано использовать `border`.


def luminance(hex_color):
    hex_color = hex_color.lstrip("#")
    channels = []
    for i in (0, 2, 4):
        c = int(hex_color[i:i + 2], 16) / 255
        channels.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg, bg):
    a, b = luminance(fg), luminance(bg)
    lighter, darker = max(a, b), min(a, b)
    return (lighter + 0.05) / (darker + 0.05)


def main():
    failures = 0
    print("%-12s %-9s %7s %7s  %s" % ("текст", "фон", "факт", "норма", "применение"))
    print("-" * 72)
    for fg, bg, need, where in PAIRS:
        value = ratio(PALETTE[fg], PALETTE[bg])
        ok = value >= need
        if not ok:
            failures += 1
        print("%-12s %-9s %6.2f %7.1f  %s %s" % (
            fg, bg, value, need, "OK  " if ok else "МАЛО", where))

    print("-" * 72)
    if failures:
        print("не проходит пар: %d" % failures)
        raise SystemExit(1)
    print("все пары проходят WCAG AA")


if __name__ == "__main__":
    main()
