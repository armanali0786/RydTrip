-- DropIndex
DROP INDEX "rides_driver_id_idx";

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "distance_km" DOUBLE PRECISION,
ADD COLUMN     "fare" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "rides_driver_id_created_at_idx" ON "rides"("driver_id", "created_at");
