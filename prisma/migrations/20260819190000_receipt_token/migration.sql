-- Личный ключ страницы «сообщение принято». Номер MM-2026-0001 угадывается
-- с первой попытки, а сообщение до проверки не опубликовано — открывать его
-- по номеру нельзя.
--
-- Колонка необязательная: у 65 перенесённых сообщений ключа нет.

ALTER TABLE "reports" ADD COLUMN "receiptToken" TEXT;
CREATE UNIQUE INDEX "reports_receiptToken_key" ON "reports"("receiptToken");
