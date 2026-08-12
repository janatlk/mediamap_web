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

# Прежние типы нарушений плюс кыргызские названия и пояснения,
# которых в базе не было вовсе.
TYPES = {
    "Язык вражды": {
        "slug": "hate-speech",
        "nameKy": "Жек көрүү тили",
        "descRu": "Высказывания, унижающие человека или группу по признаку "
                  "национальности, языка, религии, пола или происхождения.",
        "descKy": "Улуту, тили, дини, жынысы же теги боюнча адамды же топту "
                  "кемсинткен сөздөр.",
        "sort": 1,
    },
    "Дезинформация": {
        "slug": "disinformation",
        "nameKy": "Жалган маалымат",
        "descRu": "Ложные сведения, распространяемые намеренно: выдуманные "
                  "факты, поддельные цитаты, искажённая статистика.",
        "descKy": "Атайын таратылган жалган маалымат: ойдон чыгарылган "
                  "фактылар, жасалма цитаталар, бурмаланган статистика.",
        "sort": 2,
    },
    "Пропаганда": {
        "slug": "propaganda",
        "nameKy": "Үгүт",
        "descRu": "Односторонняя подача, рассчитанная на эмоцию, а не на "
                  "понимание: подмена понятий, давление, замалчивание.",
        "descKy": "Түшүнүүгө эмес, сезимге эсептелген бир жактуу маалымат: "
                  "түшүнүктөрдү алмаштыруу, басым, жашыруу.",
        "sort": 3,
    },
    "Другое": {
        "slug": "other",
        "nameKy": "Башка",
        "descRu": "Нарушения, не подходящие под остальные категории. "
                  "Модератор уточняет тип при рассмотрении.",
        "descKy": "Башка категорияларга кирбеген бузуулар. Модератор "
                  "кароодо түрүн тактайт.",
        "sort": 4,
    },
}

NEWS_LIMIT = 300


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.exists(src):
        raise SystemExit("Не найдена база прежнего сайта: " + src)

    db = sqlite3.connect(src)
    db.row_factory = sqlite3.Row

    types = []
    type_slug_by_id = {}
    for row in db.execute("select id, violationType from violation_types"):
        name = row["violationType"]
        if name not in TYPES:
            raise KeyError("Тип нарушения без описания: " + name)
        meta = TYPES[name]
        type_slug_by_id[row["id"]] = meta["slug"]
        types.append({"slug": meta["slug"], "nameRu": name, **{
            k: v for k, v in meta.items() if k != "slug"
        }})
    types.sort(key=lambda t: t["sort"])

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
