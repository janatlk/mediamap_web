-- Предварительная оценка сообщения. Снимается при подаче и ничего не
-- решает: статус по-прежнему ставит живой человек. Нужна, чтобы очередь
-- на проверку шла с самого похожего на настоящее нарушение.
--
-- Все колонки необязательные: у 65 перенесённых сообщений оценки нет и
-- взяться ей неоткуда.

ALTER TABLE "reports" ADD COLUMN "aiVerdict" TEXT;
ALTER TABLE "reports" ADD COLUMN "aiConfidence" REAL;
ALTER TABLE "reports" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "reports" ADD COLUMN "aiSource" TEXT;
ALTER TABLE "reports" ADD COLUMN "aiCheckedAt" DATETIME;
