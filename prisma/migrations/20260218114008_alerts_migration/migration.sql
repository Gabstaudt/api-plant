-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('CRITICO', 'MEDIO', 'BAIXO');

-- CreateEnum
CREATE TYPE "public"."AlertCondition" AS ENUM ('ABOVE_IDEAL', 'BELOW_IDEAL', 'EQUALS', 'GREATER_THAN', 'LESS_THAN');

-- CreateTable
CREATE TABLE "public"."AlertRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "measurementType" TEXT NOT NULL,
    "unit" TEXT,
    "condition" "public"."AlertCondition" NOT NULL,
    "threshold" DECIMAL(65,30),
    "severity" "public"."AlertSeverity" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SensorAlertRule" (
    "id" SERIAL NOT NULL,
    "sensorId" INTEGER NOT NULL,
    "alertRuleId" INTEGER NOT NULL,

    CONSTRAINT "SensorAlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SensorAlertRule_sensorId_alertRuleId_key" ON "public"."SensorAlertRule"("sensorId", "alertRuleId");

-- AddForeignKey
ALTER TABLE "public"."AlertRule" ADD CONSTRAINT "AlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensorAlertRule" ADD CONSTRAINT "SensorAlertRule_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "public"."Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SensorAlertRule" ADD CONSTRAINT "SensorAlertRule_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "public"."AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
