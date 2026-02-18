-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('ATIVO', 'RESOLVIDO');

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'ATIVO',
    "severity" "public"."AlertSeverity" NOT NULL,
    "value" DECIMAL(65,30),
    "unit" TEXT,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedComment" TEXT,
    "userId" INTEGER NOT NULL,
    "plantId" INTEGER,
    "sensorId" INTEGER NOT NULL,
    "alertRuleId" INTEGER,
    "resolvedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AlertEvent" (
    "id" SERIAL NOT NULL,
    "alertId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "public"."Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "public"."AlertRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertEvent" ADD CONSTRAINT "AlertEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertEvent" ADD CONSTRAINT "AlertEvent_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "public"."Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
