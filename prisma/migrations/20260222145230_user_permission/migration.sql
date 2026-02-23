-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "roleProfileId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleProfileId_fkey" FOREIGN KEY ("roleProfileId") REFERENCES "public"."RoleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
