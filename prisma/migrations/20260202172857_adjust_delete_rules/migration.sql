-- DropForeignKey
ALTER TABLE "public"."SensorReadings" DROP CONSTRAINT "SensorReadings_sensorId_fkey";

-- AddForeignKey
ALTER TABLE "public"."SensorReadings" ADD CONSTRAINT "SensorReadings_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "public"."Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
