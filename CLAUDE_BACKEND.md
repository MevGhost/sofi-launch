# CLAUDE_BACKEND.md - S4 Labs Backend Integration Requirements

> **IMPORTANT**: This document contains all backend requirements for integrating escrow functionality into S4 Labs platform. All frontend implementations use mock data placed in the correct locations for easy backend integration.

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Smart Contract Integration](#smart-contract-integration)
5. [WebSocket Events](#websocket-events)
6. [Authentication & Authorization](#authentication--authorization)
7. [Mock Data Locations](#mock-data-locations)
8. [Environment Variables](#environment-variables)
9. [Third-Party Services](#third-party-services)

---

## 1. Overview

### Architecture Requirements
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for rate limiting and data caching
- **Real-time**: WebSocket (ws) for live updates
- **Authentication**: JWT with multi-chain wallet signatures
- **Blockchain**: ethers.js v6 for EVM, @coral-xyz/anchor for Solana

### Key Features to Implement
- Multi-chain escrow management (Base L2 + Solana)
- Milestone-based token release system
- Multi-verifier approval mechanism
- Dispute resolution workflow
- Platform fee collection
- Real-time status updates
- Activity audit trail

---

## 2. Database Schema

### Prisma Schema Requirements

```prisma
// User Model Extensions
model User {
  id              String    @id @default(cuid())
  address         String    @unique
  chainType       ChainType @default(EVM) // EVM or SOLANA
  role            UserRole  @default(USER) // USER, KOL, ADMIN, VERIFIER
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  escrowsCreated  Escrow[]  @relation("Creator")
  escrowsAsKol    Escrow[]  @relation("Kol")
  verifications   Verification[]
  activities      Activity[]
  notifications   Notification[]
}

enum ChainType {
  EVM
  SOLANA
}

enum UserRole {
  USER
  KOL
  ADMIN
  VERIFIER
}

// Escrow Model
model Escrow {
  id                  String    @id @default(cuid())
  contractAddress     String?   // For deployed escrows
  programId           String?   // For Solana escrows
  chainId             Int       // 8453 for Base, 84532 for Base Sepolia
  
  // Participants
  creatorId           String
  creator             User      @relation("Creator", fields: [creatorId], references: [id])
  kolId               String
  kol                 User      @relation("Kol", fields: [kolId], references: [id])
  
  // Token Details
  tokenAddress        String
  tokenSymbol         String
  tokenDecimals       Int
  totalAmount         BigInt
  releasedAmount      BigInt    @default(0)
  
  // Status
  status              EscrowStatus
  disputeActive       Boolean   @default(false)
  
  // Timestamps
  startDate           DateTime
  endDate             DateTime
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relations
  milestones          Milestone[]
  verifications       Verification[]
  activities          Activity[]
  disputes            Dispute[]
}

enum EscrowStatus {
  DRAFT
  PENDING_FUNDING
  ACTIVE
  COMPLETED
  CANCELLED
  DISPUTED
}

// Milestone Model
model Milestone {
  id              String    @id @default(cuid())
  escrowId        String
  escrow          Escrow    @relation(fields: [escrowId], references: [id])
  
  title           String
  description     String
  amount          BigInt
  releaseDate     DateTime
  
  // Verification Requirements
  requiredProofs  Json      // Array of proof types required
  verifierCount   Int       @default(1) // Min verifiers needed
  
  // Status
  status          MilestoneStatus
  proofUrl        String?   // Submitted proof
  releaseHash     String?   // Transaction hash of release
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  verifications   Verification[]
}

enum MilestoneStatus {
  PENDING
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  RELEASED
  REJECTED
  DISPUTED
}

// Verification Model
model Verification {
  id              String    @id @default(cuid())
  milestoneId     String
  milestone       Milestone @relation(fields: [milestoneId], references: [id])
  verifierId      String
  verifier        User      @relation(fields: [verifierId], references: [id])
  escrowId        String
  escrow          Escrow    @relation(fields: [escrowId], references: [id])
  
  approved        Boolean
  comments        String?
  proofHash       String?   // IPFS or other proof storage
  
  createdAt       DateTime  @default(now())
}

// Activity Model (Audit Trail)
model Activity {
  id              String    @id @default(cuid())
  escrowId        String
  escrow          Escrow    @relation(fields: [escrowId], references: [id])
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  action          String    // CREATED, FUNDED, MILESTONE_SUBMITTED, etc.
  details         Json      // Additional context
  txHash          String?   // Blockchain transaction hash
  
  createdAt       DateTime  @default(now())
}

// Dispute Model
model Dispute {
  id              String    @id @default(cuid())
  escrowId        String
  escrow          Escrow    @relation(fields: [escrowId], references: [id])
  
  raisedBy        String    // User address
  reason          String
  evidence        Json      // Array of evidence URLs
  
  status          DisputeStatus
  resolution      String?
  resolvedBy      String?
  resolvedAt      DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED
  ESCALATED
}

// Notification Model
model Notification {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  type            NotificationType
  title           String
  message         String
  data            Json?     // Additional context
  read            Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
}

enum NotificationType {
  ESCROW_CREATED
  ESCROW_FUNDED
  MILESTONE_DUE
  MILESTONE_SUBMITTED
  MILESTONE_APPROVED
  MILESTONE_RELEASED
  DISPUTE_RAISED
  DISPUTE_RESOLVED
}

// Platform Settings
model PlatformSettings {
  id              String    @id @default(cuid())
  key             String    @unique
  value           Json
  updatedAt       DateTime  @updatedAt
}
```

---

## 3. API Endpoints

### Authentication Routes
```typescript
// POST /api/auth/connect
// Connect wallet and get JWT token
{
  body: {
    address: string,
    signature: string,
    message: string,
    chainType: 'EVM' | 'SOLANA'
  }
  response: {
    token: string,
    user: User
  }
}

// GET /api/auth/me
// Get current user profile
Headers: Authorization: Bearer <token>
Response: User object with role and permissions
```

### Escrow Management Routes
```typescript
// GET /api/escrows
// List escrows with filters
Query params: ?role=creator|kol|verifier&status=active&chainId=8453
Response: Escrow[] with pagination

// GET /api/escrows/:id
// Get escrow details
Response: Escrow with milestones, verifications, activities

// POST /api/escrows
// Create new escrow
Body: {
  kolAddress: string,
  tokenAddress: string,
  totalAmount: string,
  milestones: Milestone[],
  chainId: number,
  startDate: string,
  endDate: string
}

// POST /api/escrows/:id/deploy
// Deploy escrow to blockchain
Response: { contractAddress: string, txHash: string }

// POST /api/escrows/:id/fund
// Fund escrow contract
Body: { txHash: string }

// DELETE /api/escrows/:id
// Cancel/delete draft escrow
```

### Milestone Management Routes
```typescript
// GET /api/escrows/:escrowId/milestones
// List milestones for escrow

// POST /api/escrows/:escrowId/milestones/:milestoneId/submit
// Submit milestone proof
Body: {
  proofUrl: string,
  description: string,
  evidenceLinks: string[]
}

// POST /api/escrows/:escrowId/milestones/:milestoneId/verify
// Verifier approves/rejects milestone
Body: {
  approved: boolean,
  comments: string
}

// POST /api/escrows/:escrowId/milestones/:milestoneId/release
// Release milestone funds
Response: { txHash: string }

// POST /api/escrows/:escrowId/milestones/:milestoneId/claim
// KOL claims released funds
Response: { txHash: string }
```

### Admin Routes
```typescript
// GET /api/admin/dashboard
// Admin dashboard statistics
Response: {
  totalEscrows: number,
  activeEscrows: number,
  totalVolume: string,
  platformFees: string,
  disputes: number
}

// GET /api/admin/escrows
// List all escrows (admin view)

// POST /api/admin/escrows/:id/emergency-release
// Emergency release of funds

// POST /api/admin/escrows/:id/clawback
// Clawback funds to creator

// GET /api/admin/disputes
// List all disputes

// POST /api/admin/disputes/:id/resolve
// Resolve dispute
Body: {
  resolution: string,
  refundAmount?: string
}
```

### KOL Routes
```typescript
// GET /api/kol/dashboard
// KOL dashboard data
Response: {
  activeDeals: number,
  totalEarnings: string,
  pendingPayouts: string,
  completedDeals: number,
  upcomingMilestones: Milestone[]
}

// GET /api/kol/escrows
// List KOL's escrows

// GET /api/kol/earnings
// Earnings breakdown
```

### Verifier Routes
```typescript
// GET /api/verifier/queue
// Get verification queue

// GET /api/verifier/stats
// Verifier statistics

// POST /api/verifier/register
// Register as verifier
Body: {
  expertise: string[],
  credentials: string
}
```

### Dispute Routes
```typescript
// POST /api/escrows/:id/dispute
// Raise dispute
Body: {
  reason: string,
  evidence: string[]
}

// GET /api/disputes/:id
// Get dispute details

// POST /api/disputes/:id/comment
// Add comment to dispute
```

### Notification Routes
```typescript
// GET /api/notifications
// Get user notifications

// POST /api/notifications/:id/read
// Mark notification as read

// DELETE /api/notifications/:id
// Delete notification
```

---

## 4. Smart Contract Integration

### EVM (Base L2) Contracts

#### Contract Addresses (To be deployed)
```typescript
const contracts = {
  baseSepolia: {
    escrowFactory: '0x...', // Deploy EscrowFactory.sol
    adminEscrowFactory: '0x...', // Deploy AdminEscrowFactory.sol
    platformToken: '0x...', // Optional platform token
  },
  baseMainnet: {
    escrowFactory: '0x...', // Production addresses
    adminEscrowFactory: '0x...',
    platformToken: '0x...',
  }
}
```

#### Contract Service Implementation
```typescript
// services/contract.service.ts
import { ethers } from 'ethers';
import EscrowFactoryABI from '@/contracts/abis/EscrowFactory.json';
import EscrowABI from '@/contracts/abis/Escrow.json';

class ContractService {
  private provider: ethers.Provider;
  private factoryContract: ethers.Contract;
  
  async deployEscrow(params: {
    team: string,
    kol: string,
    token: string,
    totalAmount: string,
    platformFee: number,
    startTime: number,
    endTime: number
  }): Promise<string> {
    // Implementation
  }
  
  async fundEscrow(escrowAddress: string, amount: string): Promise<string> {
    // Implementation
  }
  
  async releaseMilestone(escrowAddress: string, milestoneId: number): Promise<string> {
    // Implementation
  }
  
  async claimFunds(escrowAddress: string): Promise<string> {
    // Implementation
  }
  
  async emergencyWithdraw(escrowAddress: string): Promise<string> {
    // Implementation
  }
}
```

### Solana Integration

#### Program IDs
```typescript
const solanaPrograms = {
  devnet: {
    programId: '3yZrv8dZYgK2RB94gGnECWKrKC3zkdmCodUtP6qqm5dk',
    authority: '...' // Program authority
  },
  mainnet: {
    programId: '...', // To be deployed
    authority: '...'
  }
}
```

#### Solana Service Implementation
```typescript
// services/solana.service.ts
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

class SolanaService {
  private connection: Connection;
  private program: Program;
  
  async createEscrow(params: {
    kol: PublicKey,
    token: PublicKey,
    amount: anchor.BN,
    vestingSchedule: VestingSchedule
  }): Promise<string> {
    // Implementation
  }
  
  async releaseVested(escrowPDA: PublicKey): Promise<string> {
    // Implementation
  }
  
  async claimTokens(escrowPDA: PublicKey): Promise<string> {
    // Implementation
  }
}
```

---

## 5. WebSocket Events

### WebSocket Server Setup
```typescript
// services/websocket.service.ts
import { Server } from 'ws';

const events = {
  // Escrow Events
  ESCROW_CREATED: 'escrow:created',
  ESCROW_FUNDED: 'escrow:funded',
  ESCROW_CANCELLED: 'escrow:cancelled',
  
  // Milestone Events
  MILESTONE_SUBMITTED: 'milestone:submitted',
  MILESTONE_VERIFIED: 'milestone:verified',
  MILESTONE_RELEASED: 'milestone:released',
  MILESTONE_CLAIMED: 'milestone:claimed',
  
  // Dispute Events
  DISPUTE_RAISED: 'dispute:raised',
  DISPUTE_RESOLVED: 'dispute:resolved',
  
  // Notification Events
  NOTIFICATION_NEW: 'notification:new',
  
  // Activity Events
  ACTIVITY_NEW: 'activity:new'
};

class WebSocketService {
  broadcast(event: string, data: any, filters?: { userId?: string, escrowId?: string }) {
    // Broadcast to relevant clients
  }
  
  sendToUser(userId: string, event: string, data: any) {
    // Send to specific user
  }
}
```

### Client Connection Protocol
```typescript
// Client connects with JWT token
ws.send(JSON.stringify({
  type: 'auth',
  token: jwtToken
}));

// Subscribe to escrow updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'escrow',
  escrowId: '...'
}));

// Receive updates
ws.on('message', (data) => {
  const { event, payload } = JSON.parse(data);
  // Handle event
});
```

---

## 6. Authentication & Authorization

### Multi-Chain Wallet Authentication
```typescript
// middleware/auth.middleware.ts
interface AuthRequest extends Request {
  user?: {
    id: string;
    address: string;
    chainType: 'EVM' | 'SOLANA';
    role: UserRole;
  };
}

async function authenticateWallet(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based access control
function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Signature Verification
```typescript
// EVM Signature Verification
import { verifyMessage } from 'ethers';

async function verifyEVMSignature(address: string, message: string, signature: string): Promise<boolean> {
  const recoveredAddress = verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
}

// Solana Signature Verification
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

async function verifySolanaSignature(address: string, message: string, signature: string): Promise<boolean> {
  const publicKey = new PublicKey(address);
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = Buffer.from(signature, 'base64');
  
  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBuffer());
}
```

---

## 7. Mock Data Locations

### Frontend Mock Data Files
```typescript
// src/lib/mockData/escrows.ts
export const mockEscrows = [
  {
    id: 'escrow-1',
    contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
    creator: { address: '0x...', role: 'USER' },
    kol: { address: '0x...', role: 'KOL' },
    tokenAddress: '0x...',
    tokenSymbol: 'USDC',
    totalAmount: '10000000000', // 10,000 USDC (6 decimals)
    releasedAmount: '3000000000',
    status: 'ACTIVE',
    milestones: [...],
    createdAt: '2024-01-15T10:00:00Z'
  },
  // ... more mock escrows
];

// src/lib/mockData/milestones.ts
export const mockMilestones = [
  {
    id: 'milestone-1',
    escrowId: 'escrow-1',
    title: 'Twitter Campaign Launch',
    description: 'Launch promotional campaign on Twitter',
    amount: '2500000000', // 2,500 USDC
    releaseDate: '2024-02-01T00:00:00Z',
    status: 'APPROVED',
    requiredProofs: ['twitter_link', 'engagement_metrics'],
    verifierCount: 2
  },
  // ... more milestones
];

// src/lib/mockData/activities.ts
export const mockActivities = [
  {
    id: 'activity-1',
    escrowId: 'escrow-1',
    action: 'ESCROW_CREATED',
    user: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
    details: { amount: '10000000000', token: 'USDC' },
    createdAt: '2024-01-15T10:00:00Z'
  },
  // ... more activities
];
```

### Hook Integration Points
```typescript
// src/hooks/useEscrows.ts
export function useEscrows() {
  // TODO: Replace with API call
  const [escrows, setEscrows] = useState(mockEscrows);
  
  // Placeholder for backend integration
  const fetchEscrows = async () => {
    // const response = await fetch('/api/escrows');
    // const data = await response.json();
    // setEscrows(data);
    
    // For now, use mock data
    setEscrows(mockEscrows);
  };
  
  return { escrows, fetchEscrows };
}

// src/hooks/useEscrowContract.ts
export function useEscrowContract() {
  // TODO: Replace with actual contract calls
  const deployEscrow = async (params) => {
    console.log('Deploy escrow with params:', params);
    // Simulate deployment
    return '0x' + Math.random().toString(16).substr(2, 40);
  };
  
  const releaseMilestone = async (escrowId, milestoneId) => {
    console.log('Release milestone:', { escrowId, milestoneId });
    // Simulate transaction
    return '0x' + Math.random().toString(16).substr(2, 64);
  };
  
  return { deployEscrow, releaseMilestone };
}
```

---

## 8. Environment Variables

### Required Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/s4_launchpad"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRY="7d"

# Blockchain - EVM
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0x..." # For backend operations
ESCROW_FACTORY_ADDRESS_BASE="0x..."
ESCROW_FACTORY_ADDRESS_SEPOLIA="0x..."

# Blockchain - Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
SOLANA_DEVNET_RPC_URL="https://api.devnet.solana.com"
SOLANA_PROGRAM_ID="3yZrv8dZYgK2RB94gGnECWKrKC3zkdmCodUtP6qqm5dk"
SOLANA_WALLET_PRIVATE_KEY="[...]" # Array format

# Third-Party Services
CHAINLINK_PRICE_FEED_BASE="0x..." # LINK/USD price feed
IPFS_API_URL="https://ipfs.infura.io:5001"
IPFS_GATEWAY="https://ipfs.io/ipfs/"
INFURA_PROJECT_ID="..."
ALCHEMY_API_KEY="..."

# Platform Settings
PLATFORM_FEE_PERCENTAGE="100" # 1% = 100 basis points
PLATFORM_WALLET_ADDRESS="0x..."
MIN_ESCROW_AMOUNT="1000000" # $1 USDC minimum

# WebSocket
WS_PORT="3001"
WS_HEARTBEAT_INTERVAL="30000"

# Rate Limiting
RATE_LIMIT_WINDOW="900000" # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"

# Monitoring
SENTRY_DSN="..."
LOG_LEVEL="info"
```

---

## 9. Third-Party Services

### Required Integrations

#### 1. Chainlink Price Feeds
```typescript
// For oracle-based milestone conditions
interface PriceFeedService {
  getLatestPrice(pair: string): Promise<number>;
  checkPriceCondition(condition: PriceCondition): Promise<boolean>;
}
```

#### 2. IPFS/Arweave Storage
```typescript
// For proof and evidence storage
interface StorageService {
  uploadFile(file: Buffer, metadata: object): Promise<string>;
  getFile(hash: string): Promise<Buffer>;
  pinFile(hash: string): Promise<void>;
}
```

#### 3. The Graph Protocol
```yaml
# subgraph.yaml for indexing escrow events
specVersion: 0.0.4
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: EscrowFactory
    network: base
    source:
      address: "0x..."
      abi: EscrowFactory
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.6
      language: wasm/assemblyscript
      entities:
        - Escrow
        - Milestone
        - Activity
      eventHandlers:
        - event: EscrowCreated(address,address,address,uint256)
          handler: handleEscrowCreated
```

#### 4. Email/Notification Service
```typescript
// Using SendGrid or similar
interface NotificationService {
  sendEmail(to: string, template: string, data: object): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
  sendPushNotification(userId: string, notification: object): Promise<void>;
}
```

---

## 10. Security Considerations

### Required Security Measures

1. **Rate Limiting**: Implement on all endpoints
2. **Input Validation**: Use Joi or Zod for request validation
3. **SQL Injection Prevention**: Use Prisma parameterized queries
4. **XSS Protection**: Sanitize all user inputs
5. **CORS Configuration**: Whitelist allowed origins
6. **Wallet Signature Replay Protection**: Use nonces
7. **Private Key Management**: Use AWS KMS or similar
8. **Audit Logging**: Log all critical operations
9. **Error Handling**: Don't expose sensitive information
10. **HTTPS Only**: Enforce SSL/TLS

---

## 11. Testing Requirements

### Test Coverage Needed

```typescript
// Unit Tests
- Contract service methods
- Authentication middleware
- Signature verification
- Database operations

// Integration Tests
- API endpoint flows
- WebSocket connections
- Multi-chain operations
- Notification delivery

// E2E Tests
- Complete escrow lifecycle
- Dispute resolution flow
- Multi-verifier approval
- Emergency procedures
```

---

## 12. Deployment Checklist

### Before Production

- [ ] Deploy smart contracts to Base mainnet
- [ ] Set up production database with backups
- [ ] Configure Redis cluster
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure CDN for static assets
- [ ] Set up load balancer
- [ ] Configure auto-scaling
- [ ] Set up CI/CD pipeline
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Documentation completed
- [ ] Admin dashboard deployed
- [ ] Support system ready

---

## Mock Data Implementation Status

All UI components are implemented with mock data in the following locations:

1. **Escrow Hooks**: `src/hooks/useEscrows.ts` - Ready for API integration
2. **Milestone Data**: `src/lib/mockData/milestones.ts` - Structured for backend
3. **Activity Feed**: `src/lib/mockData/activities.ts` - Audit trail ready
4. **Dashboard Stats**: `src/hooks/useDashboardStats.ts` - Aggregation mocked
5. **WebSocket Events**: `src/hooks/useWebSocket.ts` - Event structure defined

Replace mock data calls with actual API endpoints once backend is implemented.

---

**Note**: This document will be updated as the implementation progresses. All mock data follows the exact structure expected by the backend for seamless integration.