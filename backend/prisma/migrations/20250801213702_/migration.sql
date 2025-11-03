/*
  Warnings:

  - You are about to drop the column `chain` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `preferredChain` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `solanaAddress` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[chainId,chainEscrowId]` on the table `Escrow` will be added. If there are existing duplicate values, this will fail.
  - Made the column `chainEscrowId` on table `Escrow` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SyncState" AS ENUM ('IDLE', 'SYNCING', 'SUCCESS', 'FAILED', 'RETRY');

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_kolAddress_fkey";

-- DropForeignKey
ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_projectAddress_fkey";

-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_userAddress_fkey";

-- DropIndex
DROP INDEX "Activity_chain_idx";

-- DropIndex
DROP INDEX "Escrow_chainId_contractAddress_idx";

-- DropIndex
DROP INDEX "Escrow_chain_contractAddress_key";

-- DropIndex
DROP INDEX "User_solanaAddress_idx";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "chain",
ADD COLUMN     "chainId" TEXT,
ALTER COLUMN "userAddress" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Dispute" ALTER COLUMN "raisedBy" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "resolvedBy" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN     "adminControlled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chainData" JSONB,
ADD COLUMN     "escrowTokenAccount" VARCHAR(255),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "platformFeeBps" INTEGER,
ALTER COLUMN "contractAddress" DROP NOT NULL,
ALTER COLUMN "contractAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "factoryAddress" DROP NOT NULL,
ALTER COLUMN "factoryAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "chainId" SET DATA TYPE TEXT,
ALTER COLUMN "blockNumber" DROP NOT NULL,
ALTER COLUMN "transactionHash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "projectAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "kolAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "tokenAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "arbitratorAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "chain" DROP NOT NULL,
ALTER COLUMN "chainEscrowId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MilestoneSubmission" ALTER COLUMN "kolAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "reviewedBy" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "platformName" SET DEFAULT 'TokenFlow';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "preferredChain",
DROP COLUMN "solanaAddress",
ADD COLUMN     "chainType" TEXT NOT NULL DEFAULT 'evm',
ALTER COLUMN "address" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "userAddress" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "transactionHash" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Verifier" ALTER COLUMN "address" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "ChainConfig" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "chainName" TEXT NOT NULL,
    "chainType" TEXT NOT NULL,
    "rpcUrl" TEXT NOT NULL,
    "wsUrl" TEXT,
    "explorerUrl" TEXT NOT NULL,
    "nativeCurrency" JSONB NOT NULL,
    "blockTime" DOUBLE PRECISION NOT NULL,
    "isTestnet" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contractAddresses" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainHealth" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency" INTEGER,
    "blockHeight" BIGINT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "ChainHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "escrowId" TEXT,
    "operation" TEXT NOT NULL,
    "blockNumber" BIGINT,
    "transactionHash" VARCHAR(255),
    "status" "SyncState" NOT NULL,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncStatus" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "lastBlockNumber" BIGINT,
    "lastSyncedAt" TIMESTAMP(3),
    "status" "SyncState" NOT NULL DEFAULT 'IDLE',
    "error" TEXT,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChainConfig_chainId_key" ON "ChainConfig"("chainId");

-- CreateIndex
CREATE INDEX "ChainConfig_chainType_idx" ON "ChainConfig"("chainType");

-- CreateIndex
CREATE INDEX "ChainConfig_isActive_idx" ON "ChainConfig"("isActive");

-- CreateIndex
CREATE INDEX "ChainHealth_chainId_checkedAt_idx" ON "ChainHealth"("chainId", "checkedAt");

-- CreateIndex
CREATE INDEX "SyncLog_chainId_idx" ON "SyncLog"("chainId");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- CreateIndex
CREATE INDEX "SyncLog_escrowId_idx" ON "SyncLog"("escrowId");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "SyncLog"("status");

-- CreateIndex
CREATE INDEX "SyncLog_transactionHash_idx" ON "SyncLog"("transactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "SyncStatus_chainId_key" ON "SyncStatus"("chainId");

-- CreateIndex
CREATE INDEX "SyncStatus_status_idx" ON "SyncStatus"("status");

-- CreateIndex
CREATE INDEX "Activity_chainId_idx" ON "Activity"("chainId");

-- CreateIndex
CREATE INDEX "Escrow_chainId_idx" ON "Escrow"("chainId");

-- CreateIndex
CREATE INDEX "Escrow_chainId_kolAddress_idx" ON "Escrow"("chainId", "kolAddress");

-- CreateIndex
CREATE INDEX "Escrow_chainId_projectAddress_idx" ON "Escrow"("chainId", "projectAddress");

-- CreateIndex
CREATE INDEX "Escrow_chainId_status_idx" ON "Escrow"("chainId", "status");

-- CreateIndex
CREATE INDEX "Escrow_lastSyncedAt_idx" ON "Escrow"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_chainId_chainEscrowId_key" ON "Escrow"("chainId", "chainEscrowId");

-- CreateIndex
CREATE INDEX "User_chainType_idx" ON "User"("chainType");

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_kolAddress_fkey" FOREIGN KEY ("kolAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncStatus" ADD CONSTRAINT "SyncStatus_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "ChainConfig"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
