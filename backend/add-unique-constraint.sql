-- DropIndex
DROP INDEX "Escrow_chain_address_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_chain_contractAddress_key" ON "Escrow"("chain", "contractAddress");

