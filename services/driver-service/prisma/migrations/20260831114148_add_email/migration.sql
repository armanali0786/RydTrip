-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "email" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");

