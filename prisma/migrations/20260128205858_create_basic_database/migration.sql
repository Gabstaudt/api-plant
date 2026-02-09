-- CreateTable
CREATE TABLE "public"."Plant" (
    "id" SERIAL NOT NULL,
    "plantName" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "tempMax" DECIMAL(65,30) NOT NULL,
    "tempMin" DECIMAL(65,30) NOT NULL,
    "umiMax" DECIMAL(65,30) NOT NULL,
    "umiMin" DECIMAL(65,30) NOT NULL,
    "lightMax" DECIMAL(65,30) NOT NULL,
    "lightMin" DECIMAL(65,30) NOT NULL,
    "phMax" DECIMAL(65,30) NOT NULL,
    "phMin" DECIMAL(65,30) NOT NULL,
    "notesConditions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sensor" (
    "id" SERIAL NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "sensorName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "plantId" INTEGER,
    "readingIntervalSeconds" INTEGER NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SensorReadings" (
    "id" SERIAL NOT NULL,
    "sensorId" INTEGER NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorReadings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_hardwareId_key" ON "public"."Sensor"("hardwareId");

-- AddForeignKey
ALTER TABLE "public"."Plant" ADD CONSTRAINT "Plant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sensor" ADD CONSTRAINT "Sensor_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sensor" ADD CONSTRAINT "Sensor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensorReadings" ADD CONSTRAINT "SensorReadings_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "public"."Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
