-- AlterTable User - Add multi-chain support fields
ALTER TABLE "User" ADD COLUMN "solanaAddress" VARCHAR(44);
ALTER TABLE "User" ADD COLUMN "preferredChain" TEXT DEFAULT 'base-sepolia';

-- AlterTable Escrow - Add chain support fields
ALTER TABLE "Escrow" ADD COLUMN "chain" TEXT NOT NULL DEFAULT 'base-sepolia';
ALTER TABLE "Escrow" ADD COLUMN "chainEscrowId" TEXT;

-- AlterTable Activity - Add chain field
ALTER TABLE "Activity" ADD COLUMN "chain" TEXT DEFAULT 'base-sepolia';

-- CreateIndex - Add indexes for efficient multi-chain queries
CREATE INDEX "User_solanaAddress_idx" ON "User"("solanaAddress");
CREATE INDEX "Escrow_chain_idx" ON "Escrow"("chain");
CREATE INDEX "Escrow_chain_address_idx" ON "Escrow"("chain", "contractAddress");
CREATE INDEX "Activity_chain_idx" ON "Activity"("chain");

-- CreateUniqueConstraint - Ensure unique escrows per chain
CREATE UNIQUE INDEX "Escrow_chain_contractAddress_key" ON "Escrow"("chain", "contractAddress");

-- DropUniqueConstraint - Remove old unique constraint that doesn't consider chain
DROP INDEX "Escrow_contractAddress_key";