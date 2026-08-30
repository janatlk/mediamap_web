/*
  Реестр сторонних сервисов, которые берутся отличать сгенерированное
  изображение от снятого.

  Здесь только описание: как называется, какие поля доступа, сколько стоит,
  что умеет. Сами запросы — в src/server/detectors/.

  Зачем это вообще нужно, если у нас уже есть разбор происхождения. Наш
  разбор отвечает свидетельством — подписью C2PA, следом генератора — и
  молчит, когда свидетельств нет. Эти сервисы смотрят на пиксели и отвечают
  всегда. Их ответ слабее: на скриншотах и пережатых картинках независимые
  замеры дают падение точности на десятки процентных пунктов, а у части
  инструментов — ниже подбрасывания монеты.

  Поэтому страница в панели существует раньше, чем показ этих чисел людям:
  сначала надо посмотреть своими глазами, что они отвечают на наших файлах.
*/

export type CredentialField = {
  name: string;
  label: string;
  /** Подсказка под полем: где взять и как выглядит. */
  hint?: string;
};

export type DetectorInfo = {
  id: string;
  name: string;
  /** Где зарегистрироваться и взять ключ. */
  console: string;
  /** Документация по API. */
  docs: string;
  fields: CredentialField[];
  /** Бесплатный тариф словами. */
  free: string;
  /** Платный тариф словами. */
  price: string;
  video: boolean;
  /** Страна размещения — для проекта на деньги ЕС это не мелочь. */
  jurisdiction: string;
  /** Чем известен и чего от него ждать. Пишем и хорошее, и плохое. */
  note: string;
};

export const DETECTORS: DetectorInfo[] = [
  {
    id: "sightengine",
    name: "Sightengine",
    console: "https://dashboard.sightengine.com/api-credentials",
    docs: "https://sightengine.com/docs/ai-generated-image-detection",
    fields: [
      { name: "api_user", label: "API user", hint: "число, например 123456789" },
      { name: "api_secret", label: "API secret" },
    ],
    free: "2000 проверок в месяц, не больше 500 в день",
    price: "$29/мес за 10 000, сверх — $0,002 за проверку",
    video: true,
    jurisdiction: "Франция, ЕС",
    note:
      "Первое место в независимом замере университетов Канзаса и Рочестера " +
      "на 80 000 изображений — 98,3%. Сам пишет у себя, что смотрит только " +
      "на пиксели и не читает ни EXIF, ни C2PA.",
  },
  {
    id: "hive",
    name: "Hive AI",
    console: "https://thehive.ai/",
    docs: "https://docs.thehive.ai/docs/ai-image-and-video-detection",
    fields: [
      {
        name: "secret_key",
        label: "Secret Key",
        hint:
          "Именно секрет, вторая строка пары. Access Key ID не нужен: " +
          "подписывает секрет. Проверено опытом — публичная документация " +
          "описывает старый ключ проекта, которого в консоли уже нет.",
      },
    ],
    free: "100 запросов в день",
    price: "$6 за 1000 изображений; видео — $6 за 1000 кадров",
    video: true,
    jurisdiction: "США",
    note:
      "Знает больше семидесяти генераторов и называет, каким именно сделано. " +
      "Отдаёт заодно и C2PA — то, что мы и так читаем сами. Модель разбора " +
      "изображений на новой учётной записи по умолчанию закрыта: ключ " +
      "работает, а в ответ приходит «This model cannot be accessed via " +
      "API». Открывают по запросу в Hive.",
  },
  {
    id: "reality-defender",
    name: "Reality Defender",
    console: "https://app.realitydefender.ai/settings/manage-api-keys",
    docs: "https://docs.realitydefender.com/api-reference/quickstart",
    fields: [{ name: "api_key", label: "API key" }],
    free: "50 проверок в месяц",
    price: "дальше по договору, цены не публикуют",
    video: false,
    jurisdiction: "США",
    note:
      "Видео пока не умеет, обещают. Проверка идёт в три захода — запросить " +
      "адрес, залить файл, дождаться разбора, — поэтому отвечает медленнее " +
      "остальных.",
  },
];

export const detectorById = (id: string): DetectorInfo | undefined =>
  DETECTORS.find((item) => item.id === id);
