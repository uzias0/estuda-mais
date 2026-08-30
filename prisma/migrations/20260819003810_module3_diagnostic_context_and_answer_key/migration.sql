-- AlterEnum
ALTER TYPE "AttemptContext" ADD VALUE 'DIAGNOSTIC';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answerKey" JSONB;
