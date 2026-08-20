import { FileVideo } from "lucide-react";

import { ATTACHMENT_KIND } from "@/lib/enums";

/*
  Показ приложенного к сообщению.

  Ссылку собираем с личным ключом, если он есть: до проверки файл открыт
  только по нему. У опубликованного случая ключ не нужен — там разрешение
  даёт сам статус.

  Видео не проигрываем автоматически и не грузим заранее: preload="none".
  Иначе страница с тремя записями тянет сотню мегабайт у человека, который
  зашёл посмотреть номер своего сообщения.
*/

export type Attachment = {
  id: string;
  kind: string;
  name: string;
  mime: string;
};

type Props = {
  items: Attachment[];
  /** Личный ключ страницы «принято». У публичных страниц его нет. */
  token?: string;
  title: string;
};

export default function Attachments({ items, token, title }: Props) {
  if (items.length === 0) return null;

  const src = (id: string) =>
    token ? `/api/attachments/${id}?t=${token}` : `/api/attachments/${id}`;

  return (
    <section className="mt-8">
      <h2 className="text-sm text-muted">{title}</h2>

      <ul className="mt-3 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="border border-line bg-surface">
            {item.kind === ATTACHMENT_KIND.VIDEO ? (
              <video
                src={src(item.id)}
                controls
                preload="none"
                className="block max-h-80 w-full bg-ink"
              />
            ) : (
              // Открывается в полный размер: на снимке экрана мелкий текст,
              // и разглядеть его в карточке нельзя.
              <a href={src(item.id)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src(item.id)}
                  alt={item.name}
                  className="block max-h-80 w-full object-contain"
                />
              </a>
            )}

            <p className="flex items-center gap-2 border-t border-line px-3 py-2 text-sm text-muted">
              {item.kind === ATTACHMENT_KIND.VIDEO ? (
                <FileVideo className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : null}
              <span className="truncate">{item.name}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
