-- CreateTable
CREATE TABLE "public"."RoleProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ecosystemId" INTEGER NOT NULL,

    CONSTRAINT "RoleProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."RoleProfile" ADD CONSTRAINT "RoleProfile_ecosystemId_fkey" FOREIGN KEY ("ecosystemId") REFERENCES "public"."Ecosystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
