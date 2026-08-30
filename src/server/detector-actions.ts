"use server";

import { revalidatePath } from "next/cache";

import { detectorById } from "@/lib/detectors";
import { requireEditor } from "@/lib/guard";
import { secretsKeyReady } from "@/lib/secret-box";
import { ruleFor } from "@/lib/attachment-rules";
import { ATTACHMENT_KIND } from "@/lib/enums";
import { examineImage, provenanceEnabled, type ProvenanceResult } from "./provenance";
import {
  compareAll,
  probeKey,
  removeKey,
  saveKey,
  setEnabled,
  type Comparison,
} from "./detectors";

/*
  Управление ключами сторонних сервисов из панели.

  Каждое действие само проверяет доступ: серверное действие вызывается по
  своему адресу, и до него можно дотянуться, минуя страницу.

  Права те же, что у правки текстов, — это настройка сайта, а не работа с
  сообщениями заявителей.
*/

export type ActionState = { error?: string; done?: string };

const MAX_BYTES = 12 * 1024 * 1024;

function refresh(): void {
  revalidatePath("/admin/detectors", "page");
}

export async function saveDetectorKey(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireEditor();

  if (!secretsKeyReady()) {
    return {
      error:
        "SECRETS_KEY не задан. Без него ключ негде хранить: класть чужие " +
        "ключи в базу открытым текстом нельзя. Сгенерировать: openssl rand -hex 32",
    };
  }

  const id = String(form.get("service") ?? "");
  const info = detectorById(id);
  if (!info) return { error: "Неизвестный сервис" };

  const creds: Record<string, string> = {};
  for (const field of info.fields) {
    const value = String(form.get(field.name) ?? "").trim();
    if (!value) return { error: `Заполните поле «${field.label}»` };
    creds[field.name] = value;
  }

  await saveKey(id, creds);
  refresh();

  // Сразу проверяем живым запросом: сохранённый, но нерабочий ключ — это
  // ровно та беда, ради которой страница и заводилась.
  const probe = await probeKey(id);
  refresh();

  return probe.ok
    ? { done: `${info.name}: ключ сохранён и проверен, ответ за ${probe.latencyMs} мс` }
    : { error: `${info.name}: ключ сохранён, но не работает — ${probe.error}` };
}

export async function testDetectorKey(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireEditor();

  const id = String(form.get("service") ?? "");
  const info = detectorById(id);
  if (!info) return { error: "Неизвестный сервис" };

  const probe = await probeKey(id);
  refresh();

  return probe.ok
    ? { done: `${info.name}: отвечает, ${probe.latencyMs} мс` }
    : { error: `${info.name}: ${probe.error}` };
}

export async function forgetDetectorKey(form: FormData): Promise<void> {
  await requireEditor();
  const id = String(form.get("service") ?? "");
  if (detectorById(id)) await removeKey(id);
  refresh();
}

export async function toggleDetector(form: FormData): Promise<void> {
  await requireEditor();
  const id = String(form.get("service") ?? "");
  const on = String(form.get("enabled") ?? "") === "1";
  if (detectorById(id)) await setEnabled(id, on);
  refresh();
}

export type CompareState = {
  error?: string;
  fileName?: string;
  results?: Comparison[];
  /**
   * Наш собственный разбор того же файла.
   *
   * Показывается рядом со сторонними оценками намеренно. Первый же живой
   * прогон это оправдал: на обычном снимке рабочего стола сервис ответил
   * «сгенерировано, 0.99», а наш разбор — «следов не осталось». Видеть
   * такое расхождение надо на одном экране, а не выяснять перепиской.
   */
  ours?: ProvenanceResult;
  oursError?: string;
};

/**
 * Прогон одной картинки через все включённые сервисы.
 *
 * Файл нигде не сохраняется — он уходит в сервисы и пропадает. Но уходит
 * он к третьим лицам, и это стоит помнить: страница служебная, кладут туда
 * то, что не жалко показать американскому и французскому поставщику.
 */
export async function compareDetectors(
  _state: CompareState,
  form: FormData,
): Promise<CompareState> {
  await requireEditor();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Выберите изображение" };
  }
  if (file.size > MAX_BYTES) return { error: "Файл больше 12 МБ" };

  const rule = ruleFor(file.type);
  if (!rule || rule.kind !== ATTACHMENT_KIND.IMAGE) {
    return { error: "Это не изображение" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  /*
    Свой разбор и чужие оценки спрашиваем разом. Наблюдения модели не
    просим: здесь сравниваются доказательства с догадками, а наблюдения —
    третье, и они стоят секунд и денег.
  */
  const [results, ours] = await Promise.all([
    compareAll(bytes, file.type),
    provenanceEnabled()
      ? examineImage(bytes, file.type, { observe: false }).catch((error) => {
          console.error("свой разбор не удался:", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  if (results.length === 0) {
    return {
      error: "Нет ни одного включённого сервиса с рабочим ключом",
      ours: ours ?? undefined,
    };
  }

  return {
    fileName: file.name,
    results,
    ours: ours ?? undefined,
    oursError: ours ? undefined : "свой разбор не ответил",
  };
}
