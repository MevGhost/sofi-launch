-- Add chain field to Escrow table if it doesn't exist
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "chain" TEXT DEFAULT 'base-sepolia';

-- Update existing records based on chainId
UPDATE "Escrow" SET "chain" = 
  CASE 
    WHEN "chainId" = '8453' THEN 'base'
    WHEN "chainId" = '84532' THEN 'base-sepolia'
    WHEN "chainId" = 'base' THEN 'base-sepolia'
    WHEN "chainId" = 'solana' THEN 'solana-devnet'
    ELSE 'base-sepolia'
  END
WHERE "chain" IS NULL OR "chain" = 'base-sepolia';

-- Add indexes
CREATE INDEX IF NOT EXISTS "Escrow_chain_idx" ON "Escrow"("chain");
CREATE INDEX IF NOT EXISTS "Escrow_chain_address_idx" ON "Escrow"("chain", "contractAddress");