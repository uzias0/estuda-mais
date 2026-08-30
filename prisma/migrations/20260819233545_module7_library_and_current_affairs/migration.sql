-- CreateEnum
CREATE TYPE "LibraryMaterialType" AS ENUM ('LIVRO', 'EBOOK', 'ARTIGO', 'MONOGRAFIA', 'TESE', 'DISSERTACAO', 'MATERIAL_DIDATICO', 'DOCUMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "FreeAccessReason" AS ENUM ('PUBLIC_DOMAIN', 'OPEN_LICENSE', 'AUTHOR_PROVIDED', 'INSTITUTIONAL_ACCESS', 'OFFICIAL_FREE_ACCESS');

-- CreateEnum
CREATE TYPE "CurrentAffairRelevance" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditableEntityType" ADD VALUE 'LIBRARY_ITEM';
ALTER TYPE "AuditableEntityType" ADD VALUE 'CURRENT_AFFAIR';

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "authorName" TEXT,
    "academicWorkId" TEXT,
    "materialType" "LibraryMaterialType" NOT NULL,
    "language" TEXT,
    "year" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "freeAccessReason" "FreeAccessReason",
    "sourceId" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryItemKnowledgeTag" (
    "libraryItemId" TEXT NOT NULL,
    "entityType" "KnowledgeEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "LibraryItemKnowledgeTag_pkey" PRIMARY KEY ("libraryItemId","entityType","entityId")
);

-- CreateTable
CREATE TABLE "CurrentAffair" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "educationalContent" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "relevance" "CurrentAffairRelevance" NOT NULL DEFAULT 'MODERATE',
    "sourceId" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentAffair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentAffairKnowledgeTag" (
    "currentAffairId" TEXT NOT NULL,
    "entityType" "KnowledgeEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "CurrentAffairKnowledgeTag_pkey" PRIMARY KEY ("currentAffairId","entityType","entityId")
);

-- CreateTable
CREATE TABLE "_CurrentAffairToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CurrentAffairToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryItem_academicWorkId_key" ON "LibraryItem"("academicWorkId");

-- CreateIndex
CREATE INDEX "LibraryItem_status_idx" ON "LibraryItem"("status");

-- CreateIndex
CREATE INDEX "LibraryItem_materialType_idx" ON "LibraryItem"("materialType");

-- CreateIndex
CREATE INDEX "LibraryItem_sourceId_idx" ON "LibraryItem"("sourceId");

-- CreateIndex
CREATE INDEX "LibraryItem_isFree_idx" ON "LibraryItem"("isFree");

-- CreateIndex
CREATE INDEX "LibraryItemKnowledgeTag_entityType_entityId_idx" ON "LibraryItemKnowledgeTag"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CurrentAffair_status_idx" ON "CurrentAffair"("status");

-- CreateIndex
CREATE INDEX "CurrentAffair_eventDate_idx" ON "CurrentAffair"("eventDate");

-- CreateIndex
CREATE INDEX "CurrentAffair_sourceId_idx" ON "CurrentAffair"("sourceId");

-- CreateIndex
CREATE INDEX "CurrentAffairKnowledgeTag_entityType_entityId_idx" ON "CurrentAffairKnowledgeTag"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "_CurrentAffairToTag_B_index" ON "_CurrentAffairToTag"("B");

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_academicWorkId_fkey" FOREIGN KEY ("academicWorkId") REFERENCES "AcademicWork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryItemKnowledgeTag" ADD CONSTRAINT "LibraryItemKnowledgeTag_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentAffair" ADD CONSTRAINT "CurrentAffair_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentAffairKnowledgeTag" ADD CONSTRAINT "CurrentAffairKnowledgeTag_currentAffairId_fkey" FOREIGN KEY ("currentAffairId") REFERENCES "CurrentAffair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CurrentAffairToTag" ADD CONSTRAINT "_CurrentAffairToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "CurrentAffair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CurrentAffairToTag" ADD CONSTRAINT "_CurrentAffairToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
