/*
  Warnings:

  - Added the required column `unit` to the `Sensor` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Sensor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `statusReading` to the `SensorReadings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."StatusReading" AS ENUM ('NORMAL', 'ATENCAO', 'CRITICO');

-- AlterTable
ALTER TABLE "public"."Sensor" ADD COLUMN     "alertMax" DECIMAL(65,30),
ADD COLUMN     "alertMin" DECIMAL(65,30),
ADD COLUMN     "unit" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."SensorReadings" ADD COLUMN     "statusReading" "public"."StatusReading" NOT NULL;

-- DropEnum
DROP TYPE "public"."SensorType";
