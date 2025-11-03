"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const ethers_1 = require("ethers");
class DatabaseService {
    prisma;
    isConnected = false;
    connectionRetries = 0;
    maxRetries = 5;
    constructor() {
        // Production-optimized Prisma configuration
        this.prisma = new client_1.PrismaClient({
            log: process.env['NODE_ENV'] === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
            errorFormat: process.env['NODE_ENV'] === 'production' ? 'minimal' : 'pretty',
        });
        // Note: $use middleware was deprecated in Prisma 5+
        // Query monitoring is now handled through Prisma's log option
        if (process.env['NODE_ENV'] === 'development') {
            console.log('Database service initialized in development mode');
        }
    }
    async connect() {
        try {
            await this.prisma.$connect();
            this.isConnected = true;
            this.connectionRetries = 0;
            // Test the connection
            await this.prisma.$queryRaw `SELECT 1`;
            console.log('✅ Database connected successfully');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            // Retry connection with exponential backoff in production
            if (this.connectionRetries < this.maxRetries) {
                this.connectionRetries++;
                const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 30000);
                console.log(`🔄 Retrying database connection in ${delay}ms (attempt ${this.connectionRetries}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.connect();
            }
            throw new Error('Failed to connect to database after maximum retries');
        }
    }
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            this.isConnected = false;
            console.log('Database disconnected successfully');
        }
        catch (error) {
            console.error('Error disconnecting from database:', error);
            // Force disconnect
            await this.prisma.$disconnect();
        }
    }
    /**
     * Health check for database connection
     */
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Execute a transaction with retry logic for production resilience
     */
    async executeTransaction(fn, options) {
        const maxRetries = options?.maxRetries || 3;
        const timeout = options?.timeout || 30000;
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.prisma.$transaction(fn, {
                    maxWait: 5000,
                    timeout,
                });
            }
            catch (error) {
                lastError = error;
                // Don't retry on constraint violations
                if (error.code === 'P2002' || // Unique constraint
                    error.code === 'P2003' || // Foreign key constraint
                    error.code === 'P2025' // Record not found
                ) {
                    throw error;
                }
                // Retry with exponential backoff
                if (i < maxRetries - 1) {
                    const delay = Math.min(100 * Math.pow(2, i), 1000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
    // User operations
    async findOrCreateUser(address, data) {
        if (!address) {
            throw new Error('Address is required for findOrCreateUser');
        }
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
        // Check if user exists first to preserve their role
        const existingUser = await this.prisma.user.findUnique({
            where: { address: normalizedAddress },
            select: { role: true },
        });
        return this.prisma.user.upsert({
            where: { address: normalizedAddress },
            update: {
                lastLogin: new Date(),
                ...data,
                // Preserve existing role, don't overwrite it
                role: data?.role || existingUser?.role || 'team',
            },
            create: {
                address: normalizedAddress,
                // Default role is 'team' unless specified
                role: data?.role || 'team',
                ...data,
            },
        });
    }
    async updateUserNonce(address, nonce) {
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
        return this.prisma.user.update({
            where: { address: normalizedAddress },
            data: { nonce },
        });
    }
    async getUserByAddress(address) {
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
        return this.prisma.user.findUnique({
            where: { address: normalizedAddress },
            include: {
                escrowsAsProject: { take: 5, orderBy: { createdAt: 'desc' } },
                escrowsAsKol: { take: 5, orderBy: { createdAt: 'desc' } },
            },
        });
    }
    // Escrow operations
    async createEscrow(data) {
        // Ensure users exist
        await this.findOrCreateUser(data.projectAddress);
        await this.findOrCreateUser(data.kolAddress);
        // Create verifier users if needed
        if (data.verifierAddresses) {
            for (const address of data.verifierAddresses) {
                await this.findOrCreateUser(address);
            }
        }
        // Check if this is a Solana escrow based on chainId
        const isSolanaChain = String(data.chainId) === '901' || String(data.chainId) === '900';
        // Only lowercase addresses for EVM chains
        const normalizeAddress = (addr) => {
            if (!addr)
                return null;
            return isSolanaChain || !addr.startsWith('0x') ? addr : addr.toLowerCase();
        };
        const escrowData = {
            contractAddress: normalizeAddress(data.contractAddress) || '',
            factoryAddress: normalizeAddress(data.factoryAddress) || '',
            chainId: String(data.chainId),
            chainEscrowId: data.chainEscrowId || (isSolanaChain ? '' : normalizeAddress(data.contractAddress) || ''),
            blockNumber: data.blockNumber,
            transactionHash: normalizeAddress(data.transactionHash) || '',
            projectName: data.projectName,
            dealType: data.dealType,
            customDealType: data.customDealType || null,
            dealDescription: data.dealDescription,
            startDate: data.startDate,
            endDate: data.endDate,
            projectAddress: normalizeAddress(data.projectAddress) || '',
            kolAddress: normalizeAddress(data.kolAddress) || '',
            tokenAddress: normalizeAddress(data.tokenAddress) || '',
            tokenSymbol: data.tokenSymbol,
            tokenDecimals: data.tokenDecimals,
            totalAmount: data.totalAmount,
            requireVerification: data.requireVerification,
            verificationMethod: data.requireVerification && data.verificationMethod ? data.verificationMethod : null,
            disputeResolutionMethod: data.disputeResolutionMethod || null,
            arbitratorAddress: data.arbitratorAddress ? normalizeAddress(data.arbitratorAddress) : null,
            chain: data.chain || (isSolanaChain ? 'solana-devnet' : 'base-sepolia'),
            escrowTokenAccount: data.escrowTokenAccount || null,
            milestones: {
                create: data.milestones.map((milestone, index) => ({
                    milestoneIndex: index,
                    title: milestone.title,
                    description: milestone.description,
                    amount: milestone.amount,
                    percentage: milestone.percentage,
                    releaseDate: milestone.releaseDate,
                    conditions: milestone.conditions,
                })),
            },
        };
        if (data.verifierAddresses) {
            escrowData.verifiers = {
                create: data.verifierAddresses.map((address) => ({
                    address: normalizeAddress(address) || '',
                })),
            };
        }
        return this.prisma.escrow.create({
            data: escrowData,
            include: {
                milestones: true,
                verifiers: true,
                projectUser: true,
                kolUser: true,
            },
        });
    }
    async getEscrowById(id) {
        return this.prisma.escrow.findUnique({
            where: { id },
            include: {
                milestones: {
                    orderBy: { milestoneIndex: 'asc' },
                    include: {
                        submissions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1, // Get the latest submission per milestone
                        }
                    }
                },
                verifiers: true,
                verifications: {
                    include: { user: true, milestone: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                disputes: { orderBy: { createdAt: 'desc' } },
                projectUser: true,
                kolUser: true,
            },
        });
    }
    async getEscrowByAddress(contractAddress, chain = 'base-sepolia') {
        // For Solana chains, check if we need to search by chainEscrowId first
        const isSolanaChain = chain && chain.includes('solana');
        const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(contractAddress);
        if (isSolanaChain && isSolanaAddress) {
            // First try to find by chainEscrowId for Solana
            const chainId = chain === 'solana-devnet' ? '901' : '900';
            const escrowByChainId = await this.prisma.escrow.findFirst({
                where: {
                    chainId,
                    chainEscrowId: contractAddress,
                },
                include: {
                    milestones: {
                        orderBy: { milestoneIndex: 'asc' },
                        include: {
                            submissions: {
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            }
                        }
                    },
                    verifiers: true,
                    verifications: {
                        include: { user: true, milestone: true },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    },
                    disputes: { orderBy: { createdAt: 'desc' } },
                    projectUser: true,
                    kolUser: true,
                },
            });
            if (escrowByChainId) {
                return escrowByChainId;
            }
            // If not found, convert the Solana address to EVM format
            const hash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(contractAddress));
            contractAddress = '0x' + hash.substring(2, 42);
        }
        // For regular lookups, find by contract address
        return this.prisma.escrow.findFirst({
            where: {
                contractAddress: contractAddress.toLowerCase()
            },
            include: {
                milestones: {
                    orderBy: { milestoneIndex: 'asc' },
                    include: {
                        submissions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1, // Get the latest submission per milestone
                        }
                    }
                },
                verifiers: true,
                verifications: {
                    include: { user: true, milestone: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                disputes: { orderBy: { createdAt: 'desc' } },
                projectUser: true,
                kolUser: true,
            },
        });
    }
    async getUserEscrows(userAddress, role, chain) {
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = userAddress.startsWith('0x') ? userAddress.toLowerCase() : userAddress;
        if (role === 'verifier') {
            const verifiers = await this.prisma.verifier.findMany({
                where: { address: normalizedAddress, isActive: true },
                include: {
                    escrow: {
                        include: {
                            milestones: {
                                orderBy: { milestoneIndex: 'asc' },
                                include: {
                                    submissions: {
                                        orderBy: { createdAt: 'desc' },
                                        take: 1,
                                    }
                                }
                            },
                            projectUser: true,
                            kolUser: true,
                        },
                    },
                },
            });
            return verifiers.map(v => v.escrow);
        }
        const whereClause = role === 'project'
            ? { projectAddress: normalizedAddress }
            : { kolAddress: normalizedAddress };
        // Add chain filtering if provided
        if (chain) {
            whereClause.chain = chain;
        }
        return this.prisma.escrow.findMany({
            where: whereClause,
            include: {
                milestones: {
                    orderBy: { milestoneIndex: 'asc' },
                    include: {
                        submissions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        }
                    }
                },
                projectUser: true,
                kolUser: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllEscrows(filters) {
        const where = {};
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.chainId) {
            where.chainId = String(filters.chainId);
        }
        return this.prisma.escrow.findMany({
            where,
            include: {
                milestones: {
                    orderBy: { milestoneIndex: 'asc' },
                    include: {
                        submissions: true,
                    },
                },
                projectUser: true,
                kolUser: true,
            },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
        });
    }
    async updateEscrowStatus(contractAddress, status) {
        const updateData = { status };
        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        }
        else if (status === 'CANCELLED') {
            updateData.cancelledAt = new Date();
        }
        // Find escrow by contractAddress only
        const escrow = await this.prisma.escrow.findFirst({
            where: {
                contractAddress: contractAddress.toLowerCase()
            }
        });
        if (!escrow) {
            throw new Error('Escrow not found');
        }
        return this.prisma.escrow.update({
            where: { id: escrow.id },
            data: updateData,
        });
    }
    // Milestone operations
    async updateMilestoneStatus(escrowId, milestoneIndex, data) {
        return this.prisma.milestone.update({
            where: {
                escrowId_milestoneIndex: {
                    escrowId,
                    milestoneIndex,
                },
            },
            data,
        });
    }
    // Verification operations
    async createVerification(data) {
        const verifier = await this.prisma.verifier.findFirst({
            where: {
                escrowId: data.escrowId,
                address: data.verifierAddress.toLowerCase(),
                isActive: true,
            },
        });
        if (!verifier) {
            throw new Error('Verifier not found or not active');
        }
        return this.prisma.verification.create({
            data: {
                escrowId: data.escrowId,
                milestoneId: data.milestoneId,
                verifierId: verifier.id,
                userAddress: data.verifierAddress.toLowerCase(),
                action: data.action,
                signature: data.signature || null,
                transactionHash: data.transactionHash || null,
                comment: data.comment || null,
            },
            include: {
                user: true,
                milestone: true,
            },
        });
    }
    // Dispute operations
    async createDispute(data) {
        return this.prisma.dispute.create({
            data: {
                escrowId: data.escrowId,
                disputeType: data.disputeType,
                raisedBy: data.raisedBy.toLowerCase(),
                reason: data.reason,
                evidence: data.evidence,
            },
        });
    }
    async resolveDispute(disputeId, resolution, resolvedBy) {
        return this.prisma.dispute.update({
            where: { id: disputeId },
            data: {
                status: 'RESOLVED',
                resolution,
                resolvedBy: resolvedBy.toLowerCase(),
                resolvedAt: new Date(),
            },
        });
    }
    // Activity logging
    async logActivity(data) {
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = data.userAddress.startsWith('0x') ? data.userAddress.toLowerCase() : data.userAddress;
        return this.prisma.activity.create({
            data: {
                escrowId: data.escrowId || null,
                userAddress: normalizedAddress,
                action: data.action,
                details: data.details,
                ipAddress: data.ipAddress || null,
                userAgent: data.userAgent || null,
            },
        });
    }
    // Admin operations
    async getSettings() {
        return this.prisma.settings.findFirst();
    }
    async updateSettings(id, data) {
        return this.prisma.settings.update({
            where: { id },
            data,
        });
    }
    // Notification operations - DISABLED
    /*
    async createNotification(data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      data?: any;
    }) {
      return this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type as any,
          title: data.title,
          message: data.message,
          data: data.data,
        },
      });
    }
  
    async getUserNotifications(userId: string, options?: {
      limit?: number;
      unreadOnly?: boolean;
      afterDate?: Date;
    }) {
      const where: any = { userId };
      
      if (options?.unreadOnly) {
        where.read = false;
      }
      
      if (options?.afterDate) {
        where.createdAt = { gte: options.afterDate };
      }
      
      return this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
      });
    }
  
    async markNotificationAsRead(notificationId: string, userId: string) {
      return this.prisma.notification.update({
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    }
  
    async markAllNotificationsAsRead(userId: string) {
      return this.prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    }
  
    async getUnreadNotificationCount(userId: string) {
      return this.prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      });
    }
    */
    // Database model accessors
    get user() {
        return this.prisma.user;
    }
    get escrow() {
        return this.prisma.escrow;
    }
    get activity() {
        return this.prisma.activity;
    }
    get token() {
        return this.prisma.token;
    }
    get trade() {
        return this.prisma.trade;
    }
    get tokenHolder() {
        return this.prisma.tokenHolder;
    }
    // Get the Prisma client for raw queries if needed
    get client() {
        return this.prisma;
    }
}
// Export singleton instance
exports.db = new DatabaseService();
exports.default = exports.db;
//# sourceMappingURL=database.service.js.map