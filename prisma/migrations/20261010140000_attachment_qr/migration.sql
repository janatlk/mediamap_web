-- QR-коды на приложенных снимках: что записано и куда ведёт.
ALTER TABLE "attachments" ADD COLUMN "qrSummary" TEXT;
ALTER TABLE "attachments" ADD COLUMN "qrCodes" TEXT;
ALTER TABLE "attachments" ADD COLUMN "qrCheckedAt" DATETIME;
