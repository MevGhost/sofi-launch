-- First create a user if not exists
INSERT INTO "User" (id, address, "createdAt", "updatedAt")
VALUES ('user_test_1', '0x33742d3feede42eeb82e65a0155bd46b693a69f5', NOW(), NOW())
ON CONFLICT (address) DO NOTHING;

-- Get the user ID
WITH user_data AS (
  SELECT id FROM "User" WHERE address = '0x33742d3feede42eeb82e65a0155bd46b693a69f5' LIMIT 1
)
-- Insert the token
INSERT INTO "Token" (
  id,
  address,
  name,
  symbol,
  description,
  "imageUrl",
  twitter,
  telegram,
  website,
  "totalSupply",
  "bondingCurveType",
  "bondingCurveAddress",
  status,
  "marketCap",
  liquidity,
  "bondingProgress",
  "holdersCount",
  "volume24h",
  "change24h",
  "creatorId",
  "deploymentTx",
  "chainId",
  "createdAt",
  "updatedAt"
)
SELECT
  'token_asdfsdfa_1',
  '0x24c8c47641468d860cb1e7876c23f3f3565cc446',
  'asdfsdfa',
  'SDAFSADF',
  '',
  '',
  '',
  '',
  '',
  '1000000000000000000000000000',
  'constant',
  '0x4f344717f048d5b9553a8292f1c1265832537977',
  'ACTIVE',
  '3745',
  '0',
  5.4,
  1,
  '0',
  0,
  user_data.id,
  '0xac501a9ba4bfb7f86192c904f399ab5353ba41b3827c17efbd3671d3bff507e2',
  'base-sepolia',
  NOW(),
  NOW()
FROM user_data
ON CONFLICT (address) DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  "marketCap" = EXCLUDED."marketCap",
  "bondingProgress" = EXCLUDED."bondingProgress",
  "updatedAt" = NOW();