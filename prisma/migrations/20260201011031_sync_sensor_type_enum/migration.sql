/*
  Warnings:

  - Changed the type of `type` on the `Sensor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."SensorType" AS ENUM ('TEMPERATURE', 'HUMIDITY', 'PH', 'LIGHT');

-- AlterTable
ALTER TABLE "public"."Sensor" DROP COLUMN "type",
ADD COLUMN     "type" "public"."SensorType" NOT NULL;
