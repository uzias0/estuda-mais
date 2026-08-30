/*
  Warnings:

  - You are about to drop the column `isPublished` on the `Simulation` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "AuditableEntityType" ADD VALUE 'SIMULATION';

-- AlterTable
ALTER TABLE "Simulation" DROP COLUMN "isPublished",
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Simulation_status_idx" ON "Simulation"("status");

-- CreateIndex
CREATE INDEX "Simulation_createdByUserId_idx" ON "Simulation"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
