import { toggleAttachment } from "@/server/moderation-actions";
import { ATTACHMENT_KIND } from "@/lib/enums";

/*
  Приложенные файлы в панели — со снимком и решением по каждому.

  Отдельный компонент, а не общий с сайтом: на сайте показывают только то,
  что уже открыто, а здесь надо видеть всё и решать. Смешивать эти два
  случая в одном месте значило бы держать в компоненте флаг «мы в панели»,
  а с ним и риск однажды показать наружу то, что для проверяющего.

  Снимок показываем крупно намеренно. Решение «открыть файл всему свету»
  нельзя принимать по имени файла: имя ничего не говорит о том, попал ли в
  кадр номер телефона заявителя.
*/

type File = {
  id: string;
  kind: string;
  name: string;
  mime: string;
  public: boolean;
};

export default function CaseFiles({ items }: { items: File[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h3>Приложено</h3>

      <ul>
        {items.map((file) => (
          <li key={file.id}>
            {file.kind === ATTACHMENT_KIND.VIDEO ? (
              <video src={`/api/attachments/${file.id}`} controls preload="none" />
            ) : (
              <a
                href={`/api/attachments/${file.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/attachments/${file.id}`} alt={file.name} />
              </a>
            )}

            <p>
              <span className={`badge ${file.public ? "approved" : "rejected"}`}>
                {file.public ? "на сайте" : "скрыт"}
              </span>{" "}
              <span className="id">{file.name}</span>
            </p>

            <form>
              <input type="hidden" name="id" value={file.id} />
              <button type="submit" formAction={toggleAttachment}>
                {file.public ? "Убрать с сайта" : "Показать на сайте"}
              </button>{" "}
              <span className="note">
                {file.public
                  ? "виден всем на странице случая"
                  : "виден только вам и заявителю"}
              </span>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
