-- CreateTable
CREATE TABLE "public"."PlantIdealRange" (
    "id" SERIAL NOT NULL,
    "plantId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min" DECIMAL(65,30),
    "max" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantIdealRange_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PlantIdealRange" ADD CONSTRAINT "PlantIdealRange_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
