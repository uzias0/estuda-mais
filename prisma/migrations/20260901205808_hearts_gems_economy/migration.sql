-- CreateTable
CREATE TABLE "HeartState" (
    "userId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 25,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeartState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "GemTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GemTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GemTransaction_idempotencyKey_key" ON "GemTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GemTransaction_userId_createdAt_idx" ON "GemTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GemTransaction_type_idx" ON "GemTransaction"("type");

-- AddForeignKey
ALTER TABLE "HeartState" ADD CONSTRAINT "HeartState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemTransaction" ADD CONSTRAINT "GemTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
