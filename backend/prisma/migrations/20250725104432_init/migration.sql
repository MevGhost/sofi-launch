-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('SINGLE', 'MAJORITY', 'UNANIMOUS');

-- CreateEnum
CREATE TYPE "DisputeMethod" AS ENUM ('ADMIN', 'DAO', 'ARBITRATOR');

-- CreateEnum
CREATE TYPE "VerificationAction" AS ENUM ('APPROVE', 'REJECT', 'COMMENT');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('MILESTONE_DISPUTE', 'QUALITY_DISPUTE', 'DEADLINE_DISPUTE', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "nonce" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "name" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "bio" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "factoryAddress" VARCHAR(42) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" VARCHAR(66) NOT NULL,
    "projectName" TEXT NOT NULL,
    "dealType" TEXT NOT NULL,
    "customDealType" TEXT,
    "dealDescription" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "projectAddress" VARCHAR(42) NOT NULL,
    "kolAddress" VARCHAR(42) NOT NULL,
    "tokenAddress" VARCHAR(42) NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "releasedAmount" TEXT NOT NULL DEFAULT '0',
    "status" "EscrowStatus" NOT NULL DEFAULT 'ACTIVE',
    "requireVerification" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" "VerificationMethod",
    "disputeResolutionMethod" "DisputeMethod",
    "arbitratorAddress" VARCHAR(42),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "milestoneIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "conditions" TEXT[],
    "released" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verifier" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Verifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "userAddress" VARCHAR(42) NOT NULL,
    "action" "VerificationAction" NOT NULL,
    "signature" TEXT,
    "transactionHash" VARCHAR(66),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "disputeType" "DisputeType" NOT NULL,
    "raisedBy" VARCHAR(42) NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" VARCHAR(42),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT,
    "userAddress" VARCHAR(42) NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "adminAddresses" TEXT[],
    "adminPin" TEXT NOT NULL,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "announcement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_address_idx" ON "User"("address");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_contractAddress_key" ON "Escrow"("contractAddress");

-- CreateIndex
CREATE INDEX "Escrow_projectAddress_idx" ON "Escrow"("projectAddress");

-- CreateIndex
CREATE INDEX "Escrow_kolAddress_idx" ON "Escrow"("kolAddress");

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

-- CreateIndex
CREATE INDEX "Escrow_chainId_contractAddress_idx" ON "Escrow"("chainId", "contractAddress");

-- CreateIndex
CREATE INDEX "Milestone_escrowId_idx" ON "Milestone"("escrowId");

-- CreateIndex
CREATE INDEX "Milestone_released_idx" ON "Milestone"("released");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_escrowId_milestoneIndex_key" ON "Milestone"("escrowId", "milestoneIndex");

-- CreateIndex
CREATE INDEX "Verifier_escrowId_idx" ON "Verifier"("escrowId");

-- CreateIndex
CREATE INDEX "Verifier_address_idx" ON "Verifier"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Verifier_escrowId_address_key" ON "Verifier"("escrowId", "address");

-- CreateIndex
CREATE INDEX "Verification_escrowId_idx" ON "Verification"("escrowId");

-- CreateIndex
CREATE INDEX "Verification_milestoneId_idx" ON "Verification"("milestoneId");

-- CreateIndex
CREATE INDEX "Verification_userAddress_idx" ON "Verification"("userAddress");

-- CreateIndex
CREATE INDEX "Dispute_escrowId_idx" ON "Dispute"("escrowId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Activity_escrowId_idx" ON "Activity"("escrowId");

-- CreateIndex
CREATE INDEX "Activity_userAddress_idx" ON "Activity"("userAddress");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_kolAddress_fkey" FOREIGN KEY ("kolAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verifier" ADD CONSTRAINT "Verifier_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "Verifier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
