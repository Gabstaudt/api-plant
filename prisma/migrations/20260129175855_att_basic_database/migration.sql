-- AlterTable
ALTER TABLE "public"."Sensor" ADD COLUMN     "notes" TEXT,
ALTER COLUMN "readingIntervalSeconds" DROP NOT NULL;
