import DetectorCard from "@/components/admin/DetectorCard";
import DetectorCompare from "@/components/admin/DetectorCompare";
import { DETECTORS } from "@/lib/detectors";
import { requireEditor } from "@/lib/guard";
import { secretsKeyReady } from "@/lib/secret-box";
import { loadKeys } from "@/server/detectors";

export const metadata = { title: "Сервисы проверки" };

/*
  Ключи сторонних сервисов, которые берутся отличить сгенерированное
  изображение от снятого.

  Страница служебная и стоит раньше показа этих чисел людям — намеренно.
  Сначала надо посмотреть своими глазами, что сервисы отвечают на наших
  файлах, а не на лабораторных: у нас скриншоты из соцсетей, а именно на
  них независимые замеры показывают падение точности на десятки процентных
  пунктов.
*/

export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("ru", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function DetectorsPage() {
  await requireEditor();

  const keys = await loadKeys();
  const byService = new Map(keys.map((item) => [item.service, item]));

  return (
    <main className="panel">
      <h1>Сервисы проверки изображений</h1>
      <p className="lead">
        Сторонние сервисы, которые оценивают, сгенерировано ли изображение.
        Здесь вводятся ключи доступа и проверяется, что они работают.
      </p>

      <div className="warn">
        <p>
          <b>Эти сервисы отвечают всегда — в том числе неправильно.</b> Наш
          собственный разбор отвечает свидетельством: подписью происхождения
          или следом генератора, а когда их нет — молчит. Сервисы ниже смотрят
          на пиксели и выдают число на любой файл.
        </p>
        <p>
          На чистых файлах лучший из них показал 98,3% в независимом замере на
          80 000 изображений. На скриншотах инструменты с точностью выше 90%
          падают ниже 70%, после соцсети теряют от 10 до 30 процентных пунктов,
          а на картинках с текстом внутри — а это и есть скриншот поста —
          исследователи фиксируют системный провал.
        </p>
        <p>
          Поэтому сначала эта страница, и только потом решение, показывать ли
          такие числа людям. Ложное срабатывание для нас хуже пропуска: назвать
          подлинный снимок подделкой значит помочь тому, кто хочет от него
          отмахнуться.
        </p>
      </div>

      {!secretsKeyReady() ? (
        <div className="warn">
          <p>
            <b>SECRETS_KEY не задан — сохранять ключи некуда.</b> Чужие ключи
            доступа нельзя класть в базу открытым текстом: файл базы уезжает в
            резервную копию, а один потерянный архив это счёт за чужие запросы.
          </p>
          <p>
            Сгенерировать и вписать в <code>.env</code> на сервере:
            <br />
            <code>SECRETS_KEY=$(openssl rand -hex 32)</code>
            <br />
            После этого перезапустить <code>mediamap-web</code>.
          </p>
        </div>
      ) : null}

      {DETECTORS.map((info) => {
        const stored = byService.get(info.id);
        return (
          <DetectorCard
            key={info.id}
            info={info}
            state={
              stored
                ? {
                    saved: true,
                    broken: stored.broken,
                    enabled: stored.enabled,
                    lastStatus: stored.lastStatus,
                    lastError: stored.lastError,
                    lastLatencyMs: stored.lastLatencyMs,
                    lastCheckedAt: stored.lastCheckedAt
                      ? when.format(stored.lastCheckedAt)
                      : null,
                  }
                : null
            }
          />
        );
      })}

      <h2>Сравнить на одной картинке</h2>
      <p className="note">
        Прогоняет файл через все заведённые и включённые сервисы разом.
        Смотрите прежде всего на настоящих фотографиях и на скриншотах из
        кыргызстанских соцсетей: числа из чужих бенчмарков к нашему потоку
        отношения не имеют.
      </p>
      <DetectorCompare />
    </main>
  );
}
