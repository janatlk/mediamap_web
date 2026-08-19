# -*- coding: utf-8 -*-
"""Выгружает данные прежнего сайта в JSON для сида.

Запускается один раз при переезде. Дальше сид работает от файла, и старый
проект больше не нужен.

Запуск: python scripts/export-legacy.py [путь-к-database.sqlite]
Выход:  prisma/seed-data.json
"""

import json
import os
import sqlite3
import sys

DEFAULT_SRC = os.path.join(
    "..", "mm", "media-map-backend", "backend", "database.sqlite"
)
OUT = os.path.join("prisma", "seed-data.json")

# Область хранилась текстом на русском. Сохраняем код, потому что название
# переводится, а код — нет.
REGION_CODES = {
    "Чуйская область": "chuy",
    "Ошская область": "osh",
    "Таласская область": "talas",
    "Иссык-Кульская область": "issyk-kul",
    "Нарынская область": "naryn",
    "Джалал-Абадская область": "jalal-abad",
    "Баткенская область": "batken",
}

# Виды нарушений, которые показывает сайт. Их три — так решено заказчиком
# и так устроен нынешний сайт.
TARGET_TYPES = [
    {
        "slug": "hate-speech",
        "nameRu": "Язык вражды",
        "nameKy": "Жек көрүү тили",
        "descRu": "Высказывания, унижающие человека или группу по признаку "
                  "национальности, языка, религии, пола или происхождения.",
        "descKy": "Улуту, тили, дини, жынысы же теги боюнча адамды же топту "
                  "кемсинткен сөздөр.",
        "sort": 1,
    },
    {
        "slug": "disinformation",
        "nameRu": "Дезинформация",
        "nameKy": "Жалган маалымат",
        "descRu": "Ложные сведения, распространяемые намеренно: выдуманные "
                  "факты, поддельные цитаты, искажённая статистика, "
                  "односторонняя подача ради нужного вывода.",
        "descKy": "Атайын таратылган жалган маалымат: ойдон чыгарылган "
                  "фактылар, жасалма цитаталар, бурмаланган статистика, "
                  "керектүү жыйынтык үчүн бир жактуу берүү.",
        "sort": 2,
    },
    {
        "slug": "digital-fraud",
        "nameRu": "Цифровое мошенничество",
        "nameKy": "Санариптик алдамчылык",
        "descRu": "Обман ради денег или доступа к счетам: поддельные розыгрыши, "
                  "фишинговые ссылки, сообщения от чужого имени.",
        "descKy": "Акча же эсепке кирүү үчүн алдоо: жасалма утуштар, фишинг "
                  "шилтемелери, бөтөн атынан жиберилген билдирүүлөр.",
        "sort": 3,
    },
]

# Прежняя база знала четыре вида. «Пропаганда» уходит в дезинформацию:
# односторонняя подача ради нужного вывода — её частный случай, и в
# описание вида это добавлено явно. «Другое» в данных не встречается ни
# разу, поэтому переносить оттуда нечего.
LEGACY_TO_SLUG = {
    "Язык вражды": "hate-speech",
    "Дезинформация": "disinformation",
    "Пропаганда": "disinformation",
    "Другое": "disinformation",
}

NEWS_LIMIT = 300


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.exists(src):
        raise SystemExit("Не найдена база прежнего сайта: " + src)

    db = sqlite3.connect(src)
    db.row_factory = sqlite3.Row

    types = list(TARGET_TYPES)
    type_slug_by_id = {}
    for row in db.execute("select id, violationType from violation_types"):
        name = row["violationType"]
        if name not in LEGACY_TO_SLUG:
            raise KeyError("Вид нарушения без сопоставления: " + name)
        type_slug_by_id[row["id"]] = LEGACY_TO_SLUG[name]

    reports = []
    skipped = 0
    query = ("select id, position, authorRegion, authorCity, mediaLink, image, "
             "authorComment, moderatorComment, isApproved, violationTypeId, "
             "createdAt from markers order by id")
    for row in db.execute(query):
        region = REGION_CODES.get(row["authorRegion"])
        if region is None:
            skipped += 1
            continue
        try:
            position = json.loads(row["position"] or "{}")
            lat, lng = float(position["lat"]), float(position["lng"])
        except (ValueError, KeyError, TypeError):
            skipped += 1
            continue

        reports.append({
            "legacyId": row["id"],
            "lat": lat,
            "lng": lng,
            "regionCode": region,
            "city": row["authorCity"],
            "mediaLink": row["mediaLink"],
            "screenshot": row["image"],
            "authorComment": row["authorComment"],
            "moderatorComment": row["moderatorComment"],
            # Прежняя база знала только «одобрено / не одобрено».
            # Всё неодобренное переносим как ожидающее рассмотрения:
            # выдавать это за отказ было бы неправдой.
            "status": "APPROVED" if row["isApproved"] else "PENDING",
            "typeSlug": type_slug_by_id[row["violationTypeId"]],
            "createdAt": row["createdAt"],
        })

    news = []
    query = ("select guid, title, link, contentSnippet, source, pubDate "
             "from news order by pubDate desc limit ?")
    for row in db.execute(query, (NEWS_LIMIT,)):
        news.append({
            "guid": row["guid"],
            "title": row["title"],
            "link": row["link"],
            "snippet": row["contentSnippet"],
            "source": row["source"],
            "publishedAt": row["pubDate"],
        })

    payload = {"violationTypes": types, "reports": reports, "news": news}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)

    print("типов нарушений: %d" % len(types))
    print("заявок:          %d (пропущено %d)" % (len(reports), skipped))
    print("новостей:        %d" % len(news))
    print("записано в %s" % OUT)


if __name__ == "__main__":
    main()
