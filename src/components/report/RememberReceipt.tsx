"use client";

import { useEffect } from "react";

import { remember } from "@/lib/my-reports";

// Запоминает сообщение в браузере, чтобы человек нашёл его позже.
//
// Ничего не рисует. Отдельным компонентом, потому что сама страница
// «принято» серверная, а хранилище живёт только в браузере.

export default function RememberReceipt({
  token,
  publicId,
}: {
  token: string;
  publicId: string;
}) {
  useEffect(() => remember(token, publicId), [token, publicId]);
  return null;
}
