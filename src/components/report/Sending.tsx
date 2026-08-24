import type { Dictionary } from "@/lib/i18n";

/*
  Окошко ожидания на время отправки.

  Разбор сообщения занимает до пятнадцати секунд: модель читает текст, а по
  ссылке ещё и скачивает медиа. Всё это время человек раньше смотрел на
  потускневшую кнопку и не знал, отправилось у него что-нибудь или нет.

  Рисунок — не кружок из чужой библиотеки, а контур, обегающий прямоугольник:
  на сайте всё построено на тонких линиях и прямых углах, и загрузка должна
  быть из того же материала. Один элемент, никаких картинок и зависимостей.
*/

type Props = { dict: Dictionary };

export default function Sending({ dict }: Props) {
  const words = dict.reportPage;

  return (
    // aria-live не нужен: окно и так забирает внимание, а сообщать об одном
    // и том же дважды — только мешать тем, кто слушает страницу.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm border border-line bg-surface px-8 py-10 text-center">
        <RunningOutline />

        <p className="mt-8 text-lg">{words.sendingTitle}</p>
        <p className="mt-2 text-sm text-muted">{words.sendingLead}</p>
      </div>
    </div>
  );
}

/**
 * Контур, обегающий прямоугольник.
 *
 * Работает на одном штрихе: длина обводки разбита на короткий видимый кусок и
 * длинный пропуск, а сдвиг этого узора по кругу и создаёт бегущую линию.
 * Поэтому анимируется одно свойство и ничего не пересчитывается.
 */
function RunningOutline() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="mx-auto h-16 w-16"
      fill="none"
      aria-hidden="true"
    >
      {/* Бледная рамка — путь, по которому бежит линия. Без неё движение
          выглядит как обрывок, повисший в пустоте. */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="2"
        stroke="var(--color-line)"
        strokeWidth="2"
      />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="2"
        stroke="var(--color-signal)"
        strokeWidth="2"
        strokeLinecap="square"
        className="running-outline"
      />
    </svg>
  );
}
