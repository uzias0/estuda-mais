-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "ReviewItem" ADD COLUMN     "state" "ReviewState" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "reviewItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionAttemptId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "previousState" "ReviewState" NOT NULL,
    "newState" "ReviewState" NOT NULL,
    "previousIntervalDays" INTEGER NOT NULL,
    "newIntervalDays" INTEGER NOT NULL,
    "dueAtBefore" TIMESTAMP(3) NOT NULL,
    "dueAtAfter" TIMESTAMP(3) NOT NULL,
    "origin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewLog_questionAttemptId_key" ON "ReviewLog"("questionAttemptId");

-- CreateIndex
CREATE INDEX "ReviewLog_reviewItemId_idx" ON "ReviewLog"("reviewItemId");

-- CreateIndex
CREATE INDEX "ReviewLog_userId_createdAt_idx" ON "ReviewLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewItem_state_idx" ON "ReviewItem"("state");

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_reviewItemId_fkey" FOREIGN KEY ("reviewItemId") REFERENCES "ReviewItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_questionAttemptId_fkey" FOREIGN KEY ("questionAttemptId") REFERENCES "QuestionAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
