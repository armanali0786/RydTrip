-- AlterTable
ALTER TABLE "riders" ADD COLUMN     "email" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "riders_email_key" ON "riders"("email");

