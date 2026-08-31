-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "insurance_policy_number" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "license_number" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "permit_number" TEXT,
ADD COLUMN     "vehicle_registration_number" TEXT NOT NULL DEFAULT '';
