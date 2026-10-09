import VideoForm from "@/components/admin/VideoForm";
import VideoLinkForm from "@/components/admin/VideoLinkForm";
import { requireEditor } from "@/lib/guard";
import { LANGUAGES } from "@/lib/i18n/languages";
import { loadAllVideos } from "@/server/videos";
import {
  confirmVideo,
  removeVideo,
  shiftVideo,
  toggleVideo,
} from "@/server/video-actions";

export const metadata = { title: "Видео" };

/*
  Ролики для главной.

  Порядок правится стрелками, а не полем с числом: редактору нужно «этот
  выше», а не «поставьте 3». Снятый с показа ролик остаётся здесь — чтобы
  убрать его со страницы на время, не загружая потом заново.
*/

export const dynamic = "force-dynamic";

const дата = new Intl.DateTimeFormat("ru", { dateStyle: "short" });

const мегабайты = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} МБ`;

const длительность = (seconds: number | null) =>
  seconds === null
    ? "—"
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const язык = (code: string) =>
  LANGUAGES.find((item) => item.code === code)?.name ?? code;

export default async function AdminVideosPage() {
  await requireEditor();
  const all = await loadAllVideos();

  // Черновики — отдельно и сверху: это работа, которую надо доделать.
  const drafts = all.filter((video) => video.draft);
  const videos = all.filter((video) => !video.draft);

  /*
    Стрелки двигают ролик среди роликов его языка, поэтому «выше» и «ниже»
    гасим по краям каждой языковой группы, а не всей таблицы.
  */
  const sameLang = (index: number, step: number) =>
    videos[index + step]?.lang === videos[index].lang;

  return (
    <>
      <h1>Видео</h1>
      <p className="note">
        Короткие ролики на главной: как не попасться мошенникам, как узнать
        фейк. Файлы лежат у нас, а не ссылками на соцсети. У каждого языка
        свои ролики: на кыргызской главной показываются кыргызские.
      </p>

      {drafts.length > 0 ? (
        <section>
          <h2>Скачано по ссылке, ждёт подтверждения</h2>
          <p className="note">
            Посмотрите, тот ли это ролик: по ссылке иногда приходит другая
            запись из карусели или кусок с рекламой. На сайте его пока нет.
          </p>

          {drafts.map((video) => (
            <article key={video.id}>
              <header>
                <b>{video.title}</b>
                <br />
                <span className="note">
                  {язык(video.lang)} · {длительность(video.seconds)} ·{" "}
                  {мегабайты(video.size)}
                  {video.width && video.height
                    ? ` · ${video.width}×${video.height}`
                    : ""}
                </span>
                {video.sourceUrl ? (
                  <>
                    <br />
                    <a className="url note" href={video.sourceUrl} target="_blank" rel="noreferrer">
                      {video.sourceUrl}
                    </a>
                  </>
                ) : null}
              </header>

              {/* Проигрывается прямо здесь: решение «ставить или нет»
                  принимают, посмотрев ролик, а не прочитав его размер. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={`/api/videos/${video.id}`} controls preload="metadata" />

              <footer className="actions">
                <form action={confirmVideo}>
                  <input type="hidden" name="id" value={video.id} />
                  <button type="submit" className="primary">
                    Подтвердить
                  </button>
                </form>
                <form action={removeVideo}>
                  <input type="hidden" name="id" value={video.id} />
                  <button type="submit" className="danger">
                    Отменить и удалить
                  </button>
                </form>
              </footer>
            </article>
          ))}
        </section>
      ) : null}

      <section>
        <h2>Загрузить по ссылке</h2>
        <VideoLinkForm />
      </section>

      <section>
        <h2>Загрузить файлом</h2>
        <VideoForm />
      </section>

      <section>
        <h2>Загруженные</h2>

        {videos.length === 0 ? (
          <p className="note">Пока ни одного ролика.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Обложка</th>
                <th>Название</th>
                <th>Язык</th>
                <th>Длина</th>
                <th>Размер</th>
                <th>Загружен</th>
                <th>Порядок</th>
                <th>Показ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {videos.map((video, index) => (
                <tr key={video.id}>
                  <td>
                    {video.posterKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/videos/${video.id}?poster`}
                        alt=""
                        width={48}
                        height={85}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span className="note">нет</span>
                    )}
                  </td>
                  <td>
                    <a href={`/api/videos/${video.id}`} target="_blank" rel="noreferrer">
                      {video.title}
                    </a>
                  </td>
                  <td>{язык(video.lang)}</td>
                  <td>{длительность(video.seconds)}</td>
                  <td>{мегабайты(video.size)}</td>
                  <td>{дата.format(video.createdAt)}</td>
                  <td>
                    {/* Стрелки: «выше» у первого и «ниже» у последнего
                        некуда вести, поэтому их просто нет. */}
                    <form action={shiftVideo} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={video.id} />
                      <input type="hidden" name="up" value="1" />
                      <button type="submit" disabled={!sameLang(index, -1)}>
                        ↑
                      </button>
                    </form>{" "}
                    <form action={shiftVideo} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={video.id} />
                      <button type="submit" disabled={!sameLang(index, 1)}>
                        ↓
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={toggleVideo}>
                      <input type="hidden" name="id" value={video.id} />
                      <button type="submit">
                        {video.published ? "показывается" : "скрыт"}
                      </button>
                    </form>
                  </td>
                  <td>
                    {/* Удаление уносит и файл с диска: держать осиротевшее
                        видео незачем. */}
                    <form action={removeVideo}>
                      <input type="hidden" name="id" value={video.id} />
                      <button type="submit">Удалить</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
