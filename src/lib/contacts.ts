// Контакты проекта. Перенесены с нынешнего сайта как есть.
//
// Лежат отдельно от словаря: это не текст, а данные — они одинаковы на всех
// языках, и менять их придётся в одном месте, а не в каждом переводе.

export const CONTACTS = {
  telegram: "https://t.me/mediamap_kg",
  email: "media.map.kg@gmail.com",
  phone: "+996 550 786186",
} as const;

/** Телефон без пробелов и скобок — для ссылки tel:. */
export const phoneHref = `tel:${CONTACTS.phone.replace(/[^\d+]/g, "")}`;
