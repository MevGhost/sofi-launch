-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('LINK', 'FILE', 'SOCIAL');

-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN "claimedAmount" TEXT NOT NULL DEFAULT '0';
ALTER TABLE "Escrow" ADD COLUMN "requirements" TEXT[];

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN "claimed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Milestone" ADD COLUMN "claimedAt" TIMESTAMP(3);
ALTER TABLE "Milestone" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Milestone" ADD COLUMN "verificationStatus" "SubmissionStatus";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "department" TEXT;
ALTER TABLE "User" ADD COLUMN "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'team';

-- CreateTable
CREATE TABLE "MilestoneSubmission" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "kolAddress" VARCHAR(42) NOT NULL,
    "description" TEXT NOT NULL,
    "proofType" "ProofType" NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "socialPlatform" TEXT,
    "metrics" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "reviewedBy" VARCHAR(42),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MilestoneSubmission_milestoneId_idx" ON "MilestoneSubmission"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneSubmission_kolAddress_idx" ON "MilestoneSubmission"("kolAddress");

-- CreateIndex
CREATE INDEX "MilestoneSubmission_status_idx" ON "MilestoneSubmission"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "MilestoneSubmission" ADD CONSTRAINT "MilestoneSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Settings changes
ALTER TABLE "Settings" 
  DROP CONSTRAINT "Settings_pkey",
  ADD COLUMN "dailyReport" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "defaultCurrency" TEXT NOT NULL DEFAULT 'USDC',
  ADD COLUMN "disputeRaised" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "escrowCompleted" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "escrowCreated" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ipWhitelist" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "maxEscrowAmount" TEXT NOT NULL DEFAULT '1000000',
  ADD COLUMN "maxLoginAttempts" TEXT NOT NULL DEFAULT '5',
  ADD COLUMN "minEscrowAmount" TEXT NOT NULL DEFAULT '100',
  ADD COLUMN "platformFee" TEXT NOT NULL DEFAULT '2.5',
  ADD COLUMN "platformName" TEXT NOT NULL DEFAULT 'KOL Escrow Platform',
  ADD COLUMN "requireVerification" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sessionTimeout" TEXT NOT NULL DEFAULT '30',
  ADD COLUMN "twoFactorRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "userId" TEXT NOT NULL,
  ADD COLUMN "verificationRequired" BOOLEAN NOT NULL DEFAULT true;

-- AlterColumn
ALTER TABLE "Settings" ALTER COLUMN "id" SET DATA TYPE TEXT;
ALTER TABLE "Settings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Settings" ALTER COLUMN "adminAddresses" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Settings" ALTER COLUMN "adminPin" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddPrimaryKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("id");