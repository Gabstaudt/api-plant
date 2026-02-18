-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ATIVO', 'PENDENTE', 'BLOQUEADO');

-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'ADMIN_MASTER';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "ecosystemId" INTEGER,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "requestedRole" "public"."Role",
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDENTE';

-- CreateTable
CREATE TABLE "public"."Ecosystem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ecosystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ecosystem_code_key" ON "public"."Ecosystem"("code");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_ecosystemId_fkey" FOREIGN KEY ("ecosystemId") REFERENCES "public"."Ecosystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
