# -*- coding: utf-8 -*-
"""Готовит геометрию областей для главной страницы.

Исходник geoBoundaries весит 178 КБ — столько тащить в браузер незачем.
Скрипт округляет координаты до трёх знаков (примерно 100 метров на этой
широте — на карте размером с экран разницу не видно), выбрасывает мелкие
острова-полигоны и подставляет коды и названия на двух языках.

Запуск:  python scripts/prepare-regions.py
Выход:   src/data/regions.json
"""

import json
import os

SRC = os.path.join("data", "kgz-adm1.geojson")
OUT = os.path.join("src", "data", "regions.json")

# Ключ — shapeName из geoBoundaries. Названия оттуда английские,
# а сайт двуязычный, поэтому сопоставление держим здесь.
REGIONS = {
    "Batken Region":     ("batken",     "Баткенская область",      "Баткен облусу"),
    "Osh Region":        ("osh",        "Ошская область",          "Ош облусу"),
    "Talas Region":      ("talas",      "Таласская область",       "Талас облусу"),
    "Jalal-Abad Region": ("jalal-abad", "Джалал-Абадская область", "Жалал-Абад облусу"),
    "Issyk-Kul Region":  ("issyk-kul",  "Иссык-Кульская область",  "Ысык-Көл облусу"),
    "Chuy Region":       ("chuy",       "Чуйская область",         "Чүй облусу"),
    "Naryn Region":      ("naryn",      "Нарынская область",       "Нарын облусу"),
}

PRECISION = 3
# Кольца короче этого числа точек — мелкие анклавы, на обзорной карте
# они превращаются в пиксельный мусор.
MIN_RING_POINTS = 12
# Допуск упрощения в градусах. Страна занимает около 9° по долготе, и при
# ширине карты в 800 пикселей один градус — примерно 89 пикселей. Значит
# 0.011° ≈ один пиксель: контур упрощается до предела, за которым разница
# уже не видна.
TOLERANCE = 0.011


def simplify(ring, tolerance):
    """Дуглас–Пойкер без рекурсии: на длинных контурах она упирается в лимит."""
    if len(ring) < 3:
        return ring

    keep = [False] * len(ring)
    keep[0] = keep[-1] = True
    stack = [(0, len(ring) - 1)]

    while stack:
        start, end = stack.pop()
        if end <= start + 1:
            continue

        ax, ay = ring[start]
        bx, by = ring[end]
        dx, dy = bx - ax, by - ay
        span = dx * dx + dy * dy

        worst, worst_at = -1.0, start
        for i in range(start + 1, end):
            px, py = ring[i]
            if span == 0:
                # Начало и конец совпали — меряем обычное расстояние.
                dist = (px - ax) ** 2 + (py - ay) ** 2
            else:
                # Удвоенная площадь треугольника, делённая на основание,
                # даёт высоту — расстояние от точки до хорды.
                cross = dx * (py - ay) - dy * (px - ax)
                dist = cross * cross / span
            if dist > worst:
                worst, worst_at = dist, i

        if worst > tolerance * tolerance:
            keep[worst_at] = True
            stack.append((start, worst_at))
            stack.append((worst_at, end))

    return [p for p, k in zip(ring, keep) if k]


def rings_of(geometry):
    """Возвращает только внешние кольца: дырки на такой карте не читаются."""
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"][0]]
    if geometry["type"] == "MultiPolygon":
        return [poly[0] for poly in geometry["coordinates"]]
    raise ValueError("Неожиданный тип геометрии: " + geometry["type"])


def signed_area(ring):
    """Удвоенная площадь со знаком. Положительная — обход против часовой."""
    total = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        total += x1 * y2 - x2 * y1
    return total


def d3_winding(ring):
    """Приводит внешнее кольцо к обходу по часовой стрелке.

    Это не косметика. У d3-geo геометрия сферическая, и направление обхода
    задаёт, какую из двух частей сферы считать внутренней. Направление у
    d3 противоположно тому, что требует RFC 7946: там внешнее кольцо идёт
    против часовой, у d3 — по часовой.

    Пока кольца шли против часовой, d3 считал «внутренностью» всю планету
    за вычетом области: geoArea выдавала 12.566 стерадиана — площадь всей
    сферы, — и карта подгонялась под размер мира, а страна превращалась в
    точку размером в три сотых от кадра.
    """
    return ring if signed_area(ring) < 0 else ring[::-1]


def thin(ring):
    """Округляет координаты и убирает точки, ставшие одинаковыми."""
    out = []
    for lng, lat in ring:
        point = [round(lng, PRECISION), round(lat, PRECISION)]
        if not out or out[-1] != point:
            out.append(point)
    return out


def main():
    with open(SRC, encoding="utf-8") as fh:
        source = json.load(fh)

    result = []
    for feature in source["features"]:
        name = feature["properties"]["shapeName"]
        if name not in REGIONS:
            raise KeyError("Область без сопоставления: " + name)
        code, name_ru, name_ky = REGIONS[name]

        rings = [d3_winding(simplify(thin(r), TOLERANCE))
                 for r in rings_of(feature["geometry"])]
        rings = [r for r in rings if len(r) >= MIN_RING_POINTS]
        rings.sort(key=len, reverse=True)

        points = [p for ring in rings for p in ring]
        result.append({
            "code": code,
            "nameRu": name_ru,
            "nameKy": name_ky,
            "rings": rings,
            # Габариты нужны, чтобы подписать область по центру,
            # не пересчитывая геометрию в браузере.
            "bbox": [
                min(p[0] for p in points), min(p[1] for p in points),
                max(p[0] for p in points), max(p[1] for p in points),
            ],
        })

    result.sort(key=lambda r: r["code"])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, separators=(",", ":"))

    before = os.path.getsize(SRC)
    after = os.path.getsize(OUT)
    print("областей: %d" % len(result))
    print("точек:    %d" % sum(len(r) for reg in result for r in reg["rings"]))
    print("размер:   %d КБ -> %d КБ" % (before // 1024, after // 1024))


if __name__ == "__main__":
    main()
