"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const contract_service_1 = require("../services/contract.service");
const cache_service_1 = require("../services/cache.service");
const websocket_service_1 = require("../services/websocket.service");
const database_service_1 = require("../services/database.service");
const ethers_1 = require("ethers");
const bs58_1 = __importDefault(require("bs58"));
const router = (0, express_1.Router)();
// Helper function to convert Solana addresses to EVM format
function convertToEvmAddress(address) {
    // Check if it's a Solana address (base58, 44 chars)
    const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(address);
    if (isSolanaAddress) {
        // Generate a deterministic hex address from the Solana address
        const hash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(address));
        return '0x' + hash.substring(2, 42); // Take first 40 hex chars after 0x
    }
    // If it's already an EVM address, return as-is
    return address;
}
// Helper function to ensure address is properly formatted for database
function formatContractAddress(address, chain) {
    // For Solana chains, return as-is (base58 format)
    if (chain === 'solana-devnet' || chain === 'solana-mainnet') {
        return address;
    }
    // For EVM chains, ensure proper formatting
    if (address.startsWith('0x')) {
        return address.toLowerCase();
    }
    // If it doesn't start with 0x but looks like hex, add the prefix
    if (/^[0-9a-fA-F]{40}$/.test(address)) {
        return '0x' + address.toLowerCase();
    }
    // Otherwise return as-is (will likely fail validation)
    return address;
}
/**
 * POST /api/escrows/deploy
 * Deploy a new escrow contract (similar to token creation)
 */
router.post('/deploy', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { projectName, dealType, dealDescription, kolAddress, tokenAddress, tokenSymbol, totalAmount, milestones, startDate, endDate, requiresVerification, verificationMethod, verifierAddresses } = req.body;
        // Validate required fields
        if (!kolAddress || !tokenAddress || !totalAmount || !projectName) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: kolAddress, tokenAddress, totalAmount, and projectName are required'
            });
            return;
        }
        // Validate milestones
        if (!milestones || milestones.length === 0) {
            res.status(400).json({
                success: false,
                error: 'At least one milestone is required'
            });
            return;
        }
        // Deploy escrow contract via contractService
        const deploymentResult = await contract_service_1.contractService.deployEscrow({
            kolAddress,
            tokenAddress,
            totalAmount,
            milestones: milestones.map((m) => ({
                amount: m.amount,
                releaseDate: new Date(m.releaseDate).getTime() / 1000, // Convert to Unix timestamp
            })),
            verifiers: verifierAddresses || [],
            verificationThreshold: requiresVerification ? 1 : 0,
            projectAddress: req.user.address,
        });
        // Save escrow to database
        const savedEscrow = await database_service_1.db.createEscrow({
            contractAddress: deploymentResult.escrowAddress,
            factoryAddress: deploymentResult.factoryAddress || process.env['FACTORY_CONTRACT_ADDRESS'] || '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18',
            chainId: parseInt(process.env['NEXT_PUBLIC_CHAIN_ID'] || '84532'),
            chain: 'base-sepolia',
            blockNumber: BigInt(deploymentResult.blockNumber || 0),
            transactionHash: deploymentResult.transactionHash,
            projectName,
            dealType: dealType || 'OTHER',
            dealDescription,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            projectAddress: req.user.address,
            kolAddress,
            tokenAddress,
            tokenSymbol: tokenSymbol || 'TOKEN',
            tokenDecimals: 18,
            totalAmount,
            requireVerification: requiresVerification || false,
            verificationMethod: requiresVerification && verificationMethod && verificationMethod !== 'NONE' ? verificationMethod : null,
            milestones: milestones.map((m, index) => ({
                title: m.title || `Milestone ${index + 1}`,
                description: m.description || '',
                amount: m.amount.toString(),
                percentage: (parseFloat(m.amount) / parseFloat(totalAmount) * 100),
                releaseDate: m.releaseDate ? new Date(m.releaseDate) : new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000),
                conditions: m.conditions || [],
            })),
            verifierAddresses: verifierAddresses || [],
        });
        // Emit WebSocket event
        (0, websocket_service_1.emitWebSocketEvent)('escrow:created', {
            escrow: savedEscrow,
            creator: req.user.address,
        });
        // Clear cache
        await cache_service_1.escrowCache.clearPattern('escrows:*');
        res.json({
            success: true,
            data: {
                escrow: savedEscrow,
                transactionHash: deploymentResult.transactionHash,
                contractAddress: deploymentResult.escrowAddress,
            }
        });
    }
    catch (error) {
        console.error('Error deploying escrow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deploy escrow',
            details: error.message
        });
    }
});
// Create new escrow (called after on-chain deployment)
router.post('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const escrowData = req.body;
        // Validate required fields
        if (!escrowData.projectAddress || !escrowData.kolAddress) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: projectAddress and kolAddress are required'
            });
            return;
        }
        if (!escrowData.contractAddress) {
            res.status(400).json({
                success: false,
                error: 'Missing required field: contractAddress is required'
            });
            return;
        }
        // Factory address is optional for Solana
        if (escrowData.chain !== 'solana-devnet' && escrowData.chain !== 'solana-mainnet' && !escrowData.factoryAddress) {
            res.status(400).json({
                success: false,
                error: 'Missing required field: factoryAddress is required for EVM chains'
            });
            return;
        }
        // Handle addresses based on chain type
        const chain = escrowData.chain || 'base-sepolia';
        const isSolanaChain = chain === 'solana-devnet' || chain === 'solana-mainnet';
        // Only convert addresses for EVM chains, keep Solana addresses as-is
        const projectAddress = isSolanaChain ? escrowData.projectAddress : convertToEvmAddress(escrowData.projectAddress);
        const kolAddress = isSolanaChain ? escrowData.kolAddress : convertToEvmAddress(escrowData.kolAddress);
        // Check for duplicate escrow
        if (escrowData.chainEscrowId) {
            const existingEscrow = await database_service_1.db.client.escrow.findFirst({
                where: {
                    chainEscrowId: escrowData.chainEscrowId.toString(),
                    chain: chain,
                }
            });
            if (existingEscrow) {
                console.log('[Create Escrow] Duplicate detected - escrow already exists:', {
                    chainEscrowId: escrowData.chainEscrowId,
                    chain: chain,
                    existingId: existingEscrow.id
                });
                res.status(200).json({
                    success: true,
                    message: 'Escrow already exists',
                    escrowAddress: existingEscrow.contractAddress,
                    escrowId: existingEscrow.id,
                    data: {
                        ...existingEscrow,
                        blockNumber: existingEscrow.blockNumber?.toString() || '0',
                    },
                });
                return;
            }
        }
        // Also check by contract address to prevent duplicates
        const existingByAddress = await database_service_1.db.client.escrow.findFirst({
            where: {
                contractAddress: escrowData.contractAddress,
                chain: chain,
            }
        });
        if (existingByAddress) {
            console.log('[Create Escrow] Duplicate detected by address - escrow already exists:', {
                contractAddress: escrowData.contractAddress,
                chain: chain,
                existingId: existingByAddress.id
            });
            res.status(200).json({
                success: true,
                message: 'Escrow already exists',
                escrowAddress: existingByAddress.contractAddress,
                escrowId: existingByAddress.id,
                data: {
                    ...existingByAddress,
                    blockNumber: existingByAddress.blockNumber?.toString() || '0',
                },
            });
            return;
        }
        // Save to database
        const savedEscrow = await database_service_1.db.createEscrow({
            contractAddress: isSolanaChain ? escrowData.contractAddress : formatContractAddress(escrowData.contractAddress, escrowData.chain || 'base-sepolia'),
            factoryAddress: escrowData.factoryAddress || '0x0000000000000000000000000000000000000000', // Use zero address for Solana
            chainId: escrowData.chainId,
            chainEscrowId: escrowData.chainEscrowId,
            blockNumber: escrowData.blockNumber ? BigInt(escrowData.blockNumber) : BigInt(0),
            transactionHash: escrowData.transactionHash,
            projectName: escrowData.projectName,
            dealType: escrowData.dealType,
            customDealType: escrowData.customDealType,
            dealDescription: escrowData.dealDescription,
            startDate: escrowData.startDate ? new Date(escrowData.startDate) : new Date(),
            endDate: escrowData.endDate ? new Date(escrowData.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            projectAddress: projectAddress,
            kolAddress: kolAddress,
            tokenAddress: isSolanaChain ? escrowData.tokenAddress : formatContractAddress(escrowData.tokenAddress, escrowData.chain || 'base-sepolia'),
            tokenSymbol: escrowData.tokenSymbol,
            tokenDecimals: escrowData.tokenDecimals,
            totalAmount: escrowData.totalAmount,
            requireVerification: escrowData.requireVerification,
            verificationMethod: escrowData.requireVerification && escrowData.verificationMethod && escrowData.verificationMethod !== 'NONE' ? escrowData.verificationMethod : null,
            chain: chain,
            escrowTokenAccount: escrowData.escrowTokenAccount,
            milestones: escrowData.milestones ? escrowData.milestones.map((m) => ({
                title: m.title,
                description: m.description,
                amount: m.amount.toString(),
                percentage: m.percentage || (parseFloat(m.amount) / parseFloat(escrowData.totalAmount) * 100),
                releaseDate: m.releaseDate ? new Date(m.releaseDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                conditions: m.conditions || [],
            })) : [{
                    title: 'Full Payment',
                    description: 'Complete payment upon completion',
                    amount: escrowData.totalAmount,
                    percentage: 100,
                    releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    conditions: [],
                }],
            verifierAddresses: isSolanaChain ? (escrowData.verifierAddresses || []) : (escrowData.verifierAddresses || []).map(convertToEvmAddress),
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: savedEscrow.id,
            userAddress: req.user.address,
            action: 'ESCROW_CREATED',
            details: {
                projectName: escrowData.projectName,
                totalAmount: escrowData.totalAmount
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });
        // Clear cache
        cache_service_1.escrowCache.delete('escrows:list');
        // Emit WebSocket event
        (0, websocket_service_1.emitWebSocketEvent)('escrow:created', {
            escrowAddress: escrowData.contractAddress,
            projectName: escrowData.projectName,
            kolAddress: kolAddress,
            projectAddress: projectAddress,
            chain: escrowData.chain || 'base-sepolia',
        });
        res.status(201).json({
            success: true,
            message: 'Escrow saved successfully',
            escrowAddress: escrowData.contractAddress,
            escrowId: savedEscrow.id,
            data: {
                ...savedEscrow,
                blockNumber: savedEscrow.blockNumber?.toString() || '0',
            },
        });
    }
    catch (error) {
        console.error('Create escrow error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to save escrow',
            details: error.message,
            code: error.code
        });
    }
});
// Save escrow after deployment (legacy endpoint)
router.post('/save', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { escrowAddress, transactionHash, blockNumber, dealBasics, milestones, verificationSettings, deployerAddress, } = req.body;
        // Convert deployer address to EVM format for comparison
        const deployerEvmAddress = convertToEvmAddress(deployerAddress);
        // Verify deployer matches authenticated user
        if (deployerEvmAddress.toLowerCase() !== req.user.address.toLowerCase()) {
            res.status(403).json({ error: 'Deployer address mismatch' });
            return;
        }
        // Calculate total amount
        const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0).toString();
        // Convert addresses to EVM format if necessary
        const projectAddress = convertToEvmAddress(deployerAddress);
        const kolAddress = convertToEvmAddress(dealBasics.kolAddress);
        // Save to database
        const savedEscrow = await database_service_1.db.createEscrow({
            contractAddress: escrowAddress,
            factoryAddress: process.env['FACTORY_CONTRACT_ADDRESS'] || '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18',
            chainId: parseInt(process.env['NEXT_PUBLIC_CHAIN_ID'] || '84532'),
            chain: req.chain?.slug || 'base-sepolia',
            blockNumber: BigInt(blockNumber),
            transactionHash,
            projectName: dealBasics.projectName,
            dealType: dealBasics.dealType,
            customDealType: dealBasics.customDealType,
            dealDescription: dealBasics.dealDescription,
            startDate: new Date(dealBasics.startDate),
            endDate: new Date(dealBasics.endDate),
            projectAddress: projectAddress,
            kolAddress: kolAddress,
            tokenAddress: dealBasics.tokenAddress,
            tokenSymbol: dealBasics.tokenSymbol,
            tokenDecimals: dealBasics.tokenDecimals,
            totalAmount,
            requireVerification: verificationSettings.requireVerification,
            verificationMethod: verificationSettings.verificationMethod?.toUpperCase(),
            disputeResolutionMethod: verificationSettings.disputeResolutionMethod?.toUpperCase(),
            arbitratorAddress: verificationSettings.arbitratorAddress,
            milestones: milestones.map((m) => ({
                title: m.title,
                description: m.description,
                amount: m.amount.toString(),
                percentage: m.percentage,
                releaseDate: new Date(m.releaseDate),
                conditions: m.conditions || [],
            })),
            verifierAddresses: (verificationSettings.verifierAddresses || []).map(convertToEvmAddress),
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: savedEscrow.id,
            userAddress: projectAddress,
            action: 'ESCROW_CREATED',
            details: { projectName: dealBasics.projectName, totalAmount },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        // Clear cache
        cache_service_1.escrowCache.delete('escrows:list');
        // Emit WebSocket event
        (0, websocket_service_1.emitWebSocketEvent)('escrow:created', {
            escrowAddress,
            projectName: dealBasics.projectName,
            kolAddress: kolAddress,
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.status(201).json({
            success: true,
            message: 'Escrow saved successfully',
            escrowAddress,
            escrowId: savedEscrow.id,
            data: {
                id: savedEscrow.id,
                escrowAddress,
            }
        });
    }
    catch (error) {
        console.error('Save escrow error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save escrow'
        });
    }
});
// Dummy sync endpoint removed - see proper implementation below
// Search escrows, users, and transactions
router.get('/search', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { q, type = 'all' } = req.query;
        if (!q || typeof q !== 'string' || q.length < 2) {
            res.json({ success: true, data: { escrows: [], users: [], transactions: [] } });
            return;
        }
        const searchTerm = q.toLowerCase();
        const results = {
            escrows: [],
            users: [],
            transactions: []
        };
        // Search escrows
        if (type === 'all' || type === 'escrows') {
            const escrows = await database_service_1.db.client.escrow.findMany({
                where: {
                    OR: [
                        { projectName: { contains: searchTerm, mode: 'insensitive' } },
                        { contractAddress: { contains: searchTerm, mode: 'insensitive' } },
                        { kolAddress: { contains: searchTerm, mode: 'insensitive' } },
                        { projectAddress: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                    AND: [
                        {
                            OR: [
                                { projectAddress: req.user.address.toLowerCase() },
                                { kolAddress: req.user.address.toLowerCase() },
                                { verifiers: { some: { address: req.user.address.toLowerCase() } } },
                            ]
                        }
                    ]
                },
                take: 10,
                include: {
                    kolUser: true,
                    projectUser: true,
                }
            });
            results.escrows = escrows.map(e => ({
                id: e.id,
                address: e.contractAddress,
                projectName: e.projectName,
                projectAddress: e.projectAddress,
                projectUser: e.projectUser,
                kolAddress: e.kolAddress,
                kolUser: e.kolUser,
                status: e.status,
                totalAmount: e.totalAmount,
            }));
        }
        // Search users
        if (type === 'all' || type === 'users') {
            const users = await database_service_1.db.client.user.findMany({
                where: {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { address: { contains: searchTerm, mode: 'insensitive' } },
                        { email: { contains: searchTerm, mode: 'insensitive' } },
                    ]
                },
                take: 10,
                select: {
                    address: true,
                    name: true,
                    avatar: true,
                    role: true,
                }
            });
            results.users = users;
        }
        // Search transactions/activities
        if (type === 'all' || type === 'transactions') {
            const activities = await database_service_1.db.client.activity.findMany({
                where: {
                    OR: [
                        { action: { contains: searchTerm, mode: 'insensitive' } },
                        { userAddress: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                    userAddress: req.user.address.toLowerCase(),
                },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    escrow: {
                        select: {
                            projectName: true,
                            contractAddress: true,
                        }
                    }
                }
            });
            results.transactions = activities.map(a => ({
                id: a.id,
                action: a.action,
                details: a.details,
                createdAt: a.createdAt,
                escrow: a.escrow,
            }));
        }
        res.json({ success: true, data: results });
    }
    catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
});
// List escrows
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, kolAddress, projectAddress, allChains, chain, filter, userAddress } = req.query;
        // Handle filter parameter for public access
        const filterAddress = filter === 'creator' || filter === 'kol' ? userAddress : undefined;
        // Check cache
        const cacheKey = `escrows:list:${page}:${limit}:${status || ''}:${kolAddress || ''}:${projectAddress || ''}:${filterAddress || ''}:${allChains || ''}`;
        const cached = cache_service_1.escrowCache.get(cacheKey);
        if (cached) {
            res.json(cached);
            return;
        }
        // Query from database
        const filters = {};
        if (status)
            filters.status = status;
        if (kolAddress)
            filters.kolAddress = kolAddress;
        if (projectAddress)
            filters.projectAddress = projectAddress;
        let escrows = [];
        // Handle public access with filter parameter
        if (filter && userAddress) {
            const requestChain = chain || req.chain?.slug || 'base-sepolia';
            if (filter === 'creator') {
                escrows = await database_service_1.db.getUserEscrows(userAddress, 'project', requestChain);
            }
            else if (filter === 'kol') {
                escrows = await database_service_1.db.getUserEscrows(userAddress, 'kol', requestChain);
            }
        }
        else if (userAddress && !filter) {
            // Public access without filter - get all user's escrows
            const requestChain = chain || req.chain?.slug || 'base-sepolia';
            const [projectEscrows, kolEscrows] = await Promise.all([
                database_service_1.db.getUserEscrows(userAddress, 'project', requestChain),
                database_service_1.db.getUserEscrows(userAddress, 'kol', requestChain),
            ]);
            // Combine and deduplicate
            const escrowMap = new Map();
            [...projectEscrows, ...kolEscrows].forEach(escrow => {
                escrowMap.set(escrow.id, escrow);
            });
            escrows = Array.from(escrowMap.values());
        }
        else if (req.user?.role === 'admin' && allChains === 'true') {
            console.log('[GET /escrows] Admin detected with allChains=true, fetching ALL escrows across ALL chains');
            const allEscrows = await database_service_1.db.client.escrow.findMany({
                include: {
                    milestones: {
                        include: {
                            submissions: true,
                        },
                    },
                    kolUser: true,
                    projectUser: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            console.log('[GET /escrows] Found', allEscrows.length, 'escrows for admin across all chains');
            escrows = allEscrows;
        }
        else if (req.user?.role === 'admin') {
            // Admin but with specific chain filter (when allChains is not true)
            const chain = req.chain?.slug || 'base-sepolia';
            console.log('[GET /escrows] Admin detected, fetching escrows for chain:', chain);
            const chainEscrows = await database_service_1.db.client.escrow.findMany({
                where: { chain },
                include: {
                    milestones: {
                        include: {
                            submissions: true,
                        },
                    },
                    kolUser: true,
                    projectUser: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            console.log('[GET /escrows] Found', chainEscrows.length, 'escrows for admin on chain:', chain);
            escrows = chainEscrows;
        }
        else if (req.user) {
            // Get user's escrows (as project owner, KOL, or verifier)
            // Get chain from query params or request context
            const requestChain = chain || req.chain?.slug || 'base-sepolia';
            console.log('[GET /escrows] Using chain for filtering:', requestChain);
            const [projectEscrows, kolEscrows, verifierEscrows] = await Promise.all([
                database_service_1.db.getUserEscrows(req.user.address, 'project', requestChain),
                database_service_1.db.getUserEscrows(req.user.address, 'kol', requestChain),
                database_service_1.db.getUserEscrows(req.user.address, 'verifier', requestChain),
            ]);
            // Combine and deduplicate
            const escrowMap = new Map();
            [...projectEscrows, ...kolEscrows, ...verifierEscrows].forEach(escrow => {
                escrowMap.set(escrow.id, escrow);
            });
            escrows = Array.from(escrowMap.values());
        }
        // Apply additional filters
        if (status) {
            escrows = escrows.filter(e => e.status === status);
        }
        if (kolAddress) {
            console.log('[GET /escrows] Filtering by kolAddress:', kolAddress);
            console.log('[GET /escrows] Available kolAddresses:', escrows.map(e => e.kolAddress));
            const normalizedKolAddress = kolAddress.toLowerCase();
            escrows = escrows.filter(e => e.kolAddress.toLowerCase() === normalizedKolAddress);
            console.log('[GET /escrows] After KOL filter:', escrows.length, 'escrows');
        }
        if (projectAddress) {
            escrows = escrows.filter(e => e.projectAddress.toLowerCase() === projectAddress.toLowerCase());
        }
        // Pagination
        const startIndex = (Number(page) - 1) * Number(limit);
        const paginatedEscrows = escrows.slice(startIndex, startIndex + Number(limit));
        const response = {
            success: true,
            data: paginatedEscrows.map(e => ({
                id: e.id,
                address: e.contractAddress,
                chain: e.chain,
                projectName: e.projectName,
                projectAddress: e.projectAddress,
                kolAddress: e.kolAddress,
                totalAmount: e.totalAmount,
                releasedAmount: e.releasedAmount || '0',
                status: e.status.toLowerCase(),
                tokenSymbol: e.tokenSymbol,
                tokenDecimals: e.tokenDecimals,
                createdAt: e.createdAt,
                // Convert BigInt fields in milestones and other nested objects
                blockNumber: e.blockNumber?.toString() || '0',
                milestones: e.milestones.map((m) => ({
                    id: m.id,
                    title: m.title,
                    amount: m.amount,
                    releaseDate: m.releaseDate,
                    released: m.released,
                    verified: m.verified,
                    submissions: m.submissions?.map((s) => ({
                        id: s.id,
                        status: s.status.toLowerCase(),
                        createdAt: s.createdAt,
                        submittedBy: s.submittedBy,
                    })) || [],
                })),
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: escrows.length,
                totalPages: Math.ceil(escrows.length / Number(limit)),
            },
        };
        // Cache for 1 minute
        cache_service_1.escrowCache.set(cacheKey, response, 60);
        res.json(response);
    }
    catch (error) {
        console.error('List escrows error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escrows'
        });
    }
});
// Get escrow details
router.get('/:id', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Escrow ID is required'
            });
            return;
        }
        const chain = req.chain?.slug || 'base-sepolia';
        // Check if id is a database ID (CUID), numeric ID (Solana), or contract address
        const isCuid = /^[a-z0-9]{25}$/i.test(id);
        const isNumeric = /^\d+$/.test(id);
        const isSolana = chain.includes('solana');
        let escrowData;
        if (isCuid) {
            // Lookup by database ID
            escrowData = await database_service_1.db.getEscrowById(id);
        }
        else if (isNumeric && isSolana) {
            // For Solana numeric IDs, lookup by chainEscrowId
            const chainId = chain === 'solana-devnet' ? '901' : '900';
            escrowData = await database_service_1.db.client.escrow.findFirst({
                where: {
                    chainId,
                    chainEscrowId: id,
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
        }
        else {
            // Validate address based on chain type
            if (!isSolana && (!id || id.length !== 42 || !id.startsWith('0x'))) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid EVM escrow address'
                });
                return;
            }
            // Check cache
            const cacheKey = `escrow:${chain}:${id}`;
            const cached = cache_service_1.escrowCache.get(cacheKey);
            if (cached) {
                res.json({ success: true, data: cached });
                return;
            }
            // Get escrow from database by address
            escrowData = await database_service_1.db.getEscrowByAddress(id, chain);
        }
        if (!escrowData) {
            console.log(`Escrow not found for ${isCuid ? 'ID' : 'address'}: ${id}`);
            res.status(404).json({
                success: false,
                error: 'Escrow not found in database. Please ensure the escrow was saved after deployment.'
            });
            return;
        }
        // Apply access control - user must be either project owner, KOL, verifier, or admin
        const userAddress = req.user.address.toLowerCase();
        const isProjectOwner = escrowData.projectAddress.toLowerCase() === userAddress;
        const isKOL = escrowData.kolAddress.toLowerCase() === userAddress;
        const isVerifier = escrowData.verifiers.some(v => v.address.toLowerCase() === userAddress);
        const isAdmin = req.user.role === 'admin';
        if (!isProjectOwner && !isKOL && !isVerifier && !isAdmin) {
            res.status(403).json({
                success: false,
                error: 'Access denied'
            });
            return;
        }
        // Get additional on-chain data if needed (only for EVM addresses)
        let onChainData;
        if (!isSolana && escrowData.contractAddress && escrowData.contractAddress.startsWith('0x')) {
            try {
                onChainData = await contract_service_1.contractService.getEscrowDetails(escrowData.contractAddress);
            }
            catch (error) {
                console.warn('Failed to fetch on-chain data:', error.message);
                // Continue with database data only
                // This is fine as we store most data in the database anyway
            }
        }
        // Format the response to match frontend expectations
        const escrowDetails = {
            id: escrowData.id,
            address: escrowData.contractAddress,
            projectName: escrowData.projectName,
            totalAmount: escrowData.totalAmount,
            releasedAmount: escrowData.releasedAmount || '0',
            kolAddress: escrowData.kolAddress,
            projectAddress: escrowData.projectAddress,
            tokenAddress: escrowData.tokenAddress,
            tokenSymbol: escrowData.tokenSymbol,
            tokenDecimals: escrowData.tokenDecimals,
            status: escrowData.status.toLowerCase(),
            chainId: escrowData.chainId,
            chain: escrowData.chain,
            chainEscrowId: escrowData.chainEscrowId,
            escrowTokenAccount: escrowData.escrowTokenAccount,
            requireVerification: escrowData.requireVerification,
            requiresApproval: escrowData.requireVerification,
            milestones: escrowData.milestones.map((m) => ({
                id: m.milestoneIndex,
                amount: m.amount,
                releaseDate: m.releaseDate,
                released: m.released,
                verified: m.verified,
                milestoneIndex: m.milestoneIndex,
                title: m.title,
                description: m.description,
                // Include submission data
                submissions: m.submissions?.map((s) => ({
                    id: s.id,
                    status: s.status,
                    deliveryProof: s.description,
                    submitterAddress: s.kolAddress,
                    createdAt: s.createdAt,
                })),
            })),
            createdAt: escrowData.createdAt,
            dealDescription: escrowData.dealDescription,
            dealType: escrowData.dealType,
            // Override with on-chain data if available
            ...(onChainData && {
                releasedAmount: onChainData.releasedAmount,
                claimedAmount: onChainData.claimedAmount,
                status: onChainData.status,
            }),
        };
        // Cache for 30 seconds - cache by both ID and address
        if (isCuid) {
            cache_service_1.escrowCache.set(`escrow:id:${id}`, escrowDetails, 30);
            cache_service_1.escrowCache.set(`escrow:${chain}:${escrowData.contractAddress}`, escrowDetails, 30);
        }
        else {
            cache_service_1.escrowCache.set(`escrow:${chain}:${id}`, escrowDetails, 30);
            cache_service_1.escrowCache.set(`escrow:id:${escrowData.id}`, escrowDetails, 30);
        }
        res.json({
            success: true,
            data: escrowDetails,
        });
    }
    catch (error) {
        console.error('Get escrow details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escrow details'
        });
    }
});
// OLD Release milestone payment - DEPRECATED
// This endpoint expects contract addresses and on-chain verification
// Keeping for reference but commented out
/*
router.post(
  '/:id/release',
  authenticate,
  validateReleasePayment,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { milestoneId, verifierSignatures } = req.body;

      // Validate escrow address
      if (!id || id.length !== 42 || !id.startsWith('0x')) {
        res.status(400).json({
          success: false,
          error: 'Invalid escrow address'
        });
        return;
      }

      // Get escrow from database
      const escrowData = await db.getEscrowByAddress(id, (req as ChainRequest).chain?.slug || 'base-sepolia');
      
      if (!escrowData) {
        res.status(404).json({
          success: false,
          error: 'Escrow not found'
        });
        return;
      }

      // Check permissions - only project owner can release
      if (escrowData.projectAddress.toLowerCase() !== req.user!.address.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'Only project owner can release payment'
        });
        return;
      }
      
      // Find the milestone
      const milestone = escrowData.milestones.find(m => m.milestoneIndex === milestoneId);
      if (!milestone) {
        res.status(404).json({
          success: false,
          error: 'Milestone not found'
        });
        return;
      }
      
      if (milestone.released) {
        res.status(400).json({
          success: false,
          error: 'Milestone already released'
        });
        return;
      }

      // Process verifier signatures if provided
      if (verifierSignatures && verifierSignatures.length > 0) {
        // Validate signatures
        for (const _sig of verifierSignatures) {
          // Verify each signature
          // Implementation depends on your verification logic
        }
      }

      // Release payment
      const result = await contractService.releasePayment(
        id,
        milestoneId,
        req.user!.address
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      // Update database
      await db.updateMilestoneStatus(escrowData.id, milestoneId, {
        released: true,
        releasedAt: new Date(),
      });
      
      // Update escrow released amount
      const milestoneAmount = BigInt(milestone.amount);
      const currentReleasedAmount = BigInt(escrowData.releasedAmount || 0);
      const newReleasedAmount = currentReleasedAmount + milestoneAmount;
      
      await db.client.escrow.update({
        where: { id: escrowData.id },
        data: {
          releasedAmount: newReleasedAmount.toString(),
          // Since we auto-transfer, also update claimedAmount
          claimedAmount: newReleasedAmount.toString(),
        }
      });
      
      // Log activity
      await db.logActivity({
        escrowId: escrowData.id,
        userAddress: req.user!.address,
        action: 'MILESTONE_RELEASED',
        details: {
          milestoneId,
          milestoneTitle: milestone.title,
          amount: milestone.amount,
          transactionHash: result.transactionHash
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        chain: (req as ChainRequest).chain?.slug || 'base-sepolia',
      });

      // Clear cache
      escrowCache.delete(`escrow:${id}`);

      // Emit WebSocket event
      emitWebSocketEvent('milestone:released', {
        escrowAddress: id,
        milestoneId,
        releasedBy: req.user!.address,
        transactionHash: result.transactionHash,
        chain: (req as ChainRequest).chain?.slug || 'base-sepolia',
      });

      res.json({
        success: true,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
      });
    } catch (error: any) {
      console.error('Release payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to release payment'
      });
    }
  }
);
*/
// Release milestone payment (Project owner or Admin only)
// NEW endpoint that works with database IDs and supports admin override
router.post('/:id/release', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { milestoneId, skipBlockchain, transactionHash } = req.body;
        console.log('[Release Milestone] Request:', { id, milestoneId, skipBlockchain, transactionHash, user: req.user });
        // Get escrow from database using ID
        const escrow = await database_service_1.db.client.escrow.findUnique({
            where: { id },
            include: { milestones: true }
        });
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Check permissions - must be project owner or admin
        const isProjectOwner = escrow.projectAddress.toLowerCase() === req.user.address.toLowerCase();
        const isAdmin = req.user.role === 'admin';
        if (!isProjectOwner && !isAdmin) {
            res.status(403).json({
                success: false,
                error: 'Only project owner or admin can release payments'
            });
            return;
        }
        // Find the milestone
        const milestoneIndex = parseInt(milestoneId);
        const milestone = escrow.milestones.find(m => m.milestoneIndex === milestoneIndex);
        if (!milestone) {
            res.status(404).json({
                success: false,
                error: 'Milestone not found'
            });
            return;
        }
        if (milestone.released) {
            res.status(400).json({
                success: false,
                error: 'Milestone already released'
            });
            return;
        }
        // Check chain first to determine correct path
        console.log('[Release] Escrow details:', {
            id: escrow.id,
            chain: escrow.chain,
            contractAddress: escrow.contractAddress,
            isSolana: escrow.chain === 'solana-devnet' || escrow.chain === 'solana-mainnet'
        });
        // Handle Solana escrows first
        if (escrow.chain === 'solana-devnet' || escrow.chain === 'solana-mainnet') {
            // If skipBlockchain is true, just update the database
            if (skipBlockchain && transactionHash) {
                console.log('[Solana Release] Skipping blockchain, updating database only...');
                // Update milestone as released
                await database_service_1.db.client.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        released: true,
                        releasedAt: new Date(),
                        verified: true,
                        verifiedAt: new Date()
                    }
                });
                // Update escrow released amount
                const newReleasedAmount = (BigInt(escrow.releasedAmount) + BigInt(milestone.amount)).toString();
                await database_service_1.db.client.escrow.update({
                    where: { id },
                    data: {
                        releasedAmount: newReleasedAmount,
                        status: newReleasedAmount === escrow.totalAmount ? 'COMPLETED' : escrow.status
                    }
                });
                // Create activity
                await database_service_1.db.client.activity.create({
                    data: {
                        escrowId: id,
                        userAddress: req.user.address,
                        action: 'MILESTONE_RELEASED',
                        details: {
                            milestoneId: milestone.id,
                            amount: milestone.amount,
                            transactionHash: transactionHash,
                            explorerUrl: escrow.chain === 'solana-devnet'
                                ? `https://explorer.solana.com/tx/${transactionHash}?cluster=devnet`
                                : `https://explorer.solana.com/tx/${transactionHash}`,
                            note: 'Milestone released directly by admin on-chain.'
                        }
                    }
                });
                res.json({
                    success: true,
                    message: 'Milestone database updated to reflect on-chain release',
                    data: {
                        milestoneId: milestone.id,
                        released: true,
                        transactionHash: transactionHash
                    }
                });
                return;
            }
            // For Solana escrows, execute on-chain transaction
            console.log('[Solana Release] Processing Solana escrow...');
            try {
                const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
                const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
                // Check for Solana admin private key
                const adminPrivateKey = process.env.SOLANA_ADMIN_PRIVATE_KEY;
                if (!adminPrivateKey) {
                    console.error('[Solana Release] No SOLANA_ADMIN_PRIVATE_KEY found');
                    throw new Error('Solana admin private key not configured. Set SOLANA_ADMIN_PRIVATE_KEY in .env file');
                }
                console.log('[Solana Release] Found admin key, parsing...');
                // Parse the private key - could be base58 or array format
                let adminKeypair;
                try {
                    // Try parsing as JSON array first
                    const keyArray = JSON.parse(adminPrivateKey);
                    adminKeypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
                }
                catch {
                    // Try base58 format
                    const keyBytes = bs58_1.default.decode(adminPrivateKey);
                    adminKeypair = Keypair.fromSecretKey(keyBytes);
                }
                console.log('[Solana Release] Admin wallet:', adminKeypair.publicKey.toBase58());
                // Connect to Solana
                const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
                console.log('[Solana Release] Connected to Solana');
                // Create wallet adapter (matching back2back pattern)
                const walletAdapter = {
                    publicKey: adminKeypair.publicKey,
                    signTransaction: async (tx) => {
                        tx.partialSign(adminKeypair);
                        return tx;
                    },
                    signAllTransactions: async (txs) => {
                        txs.forEach(tx => tx.partialSign(adminKeypair));
                        return txs;
                    },
                };
                // Create provider
                const provider = new AnchorProvider(connection, walletAdapter, { commitment: 'confirmed' });
                // Load the program IDL and create program instance
                const idl = require('../../lib/solana-sdk/kol_escrow_platform.json');
                const programId = new PublicKey('3yZrv8dZYgK2RB94gGnECWKrKC3zkdmCodUtP6qqm5dk');
                const program = new Program(idl, programId, provider);
                // Get the escrow ID from chainEscrowId (stored as string)
                const escrowIdNum = parseInt(escrow.chainEscrowId || '0');
                const escrowId = new BN(escrowIdNum);
                console.log('[Solana Release] Escrow chain ID:', escrowIdNum);
                // Get PDAs
                const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], programId);
                const [escrowPda] = PublicKey.findProgramAddressSync([Buffer.from('escrow'), escrowId.toArrayLike(Buffer, 'le', 8)], programId);
                console.log('[Solana Release] Platform PDA:', platformPda.toBase58());
                console.log('[Solana Release] Escrow PDA:', escrowPda.toBase58());
                // Fetch platform to verify admin
                const platform = await program.account.platform.fetch(platformPda);
                if (!platform.admin.equals(adminKeypair.publicKey)) {
                    throw new Error(`You are not the platform admin. Expected: ${platform.admin.toBase58()}, Got: ${adminKeypair.publicKey.toBase58()}`);
                }
                // Fetch escrow account
                const escrowAccount = await program.account.escrow.fetch(escrowPda);
                console.log('[Solana Release] Escrow on-chain:', {
                    id: escrowAccount.escrowId.toString(),
                    adminControlled: escrowAccount.adminControlled,
                    adminApproved: escrowAccount.adminApproved,
                    amount: escrowAccount.amount.toString(),
                    releasedAmount: escrowAccount.releasedAmount.toString()
                });
                // Step 1: Admin approve if needed (matching back2back)
                if (escrowAccount.adminControlled && !escrowAccount.adminApproved) {
                    console.log('[Solana Release] Calling adminApprove...');
                    const approveTx = await program.methods
                        .adminApprove()
                        .accounts({
                        admin: adminKeypair.publicKey,
                        platform: platformPda,
                        escrow: escrowPda,
                    })
                        .rpc();
                    console.log('[Solana Release] Admin approval tx:', approveTx);
                    await connection.confirmTransaction(approveTx);
                    console.log('[Solana Release] Admin approval confirmed');
                }
                // Step 2: Force release the milestone amount
                console.log('[Solana Release] Force releasing milestone amount...');
                const releaseAmount = new BN(milestone.amount);
                // Get token accounts
                const { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
                const tokenMint = escrowAccount.tokenMint;
                const recipient = escrowAccount.recipient;
                // Get escrow vault PDA (matching back2back backend/app/index.ts pattern)
                const [escrowVaultPda] = PublicKey.findProgramAddressSync([Buffer.from('escrow-vault'), escrowId.toArrayLike(Buffer, 'le', 8)], programId);
                const escrowTokenAccount = escrowVaultPda;
                const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipient);
                const platformFeeAccount = await getAssociatedTokenAddress(tokenMint, platform.admin);
                console.log('[Solana Release] Token accounts:', {
                    escrowToken: escrowTokenAccount.toBase58(),
                    recipientToken: recipientTokenAccount.toBase58(),
                    platformFee: platformFeeAccount.toBase58()
                });
                // Call adminForceRelease (matching back2back)
                const releaseTx = await program.methods
                    .adminForceRelease(releaseAmount)
                    .accounts({
                    admin: adminKeypair.publicKey,
                    platform: platformPda,
                    escrow: escrowPda,
                    escrowTokenAccount,
                    tokenMint,
                    recipient,
                    recipientTokenAccount,
                    platformFeeAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                    .rpc();
                console.log('[Solana Release] Force release tx:', releaseTx);
                await connection.confirmTransaction(releaseTx);
                console.log('[Solana Release] Force release confirmed!');
                // Update database
                await database_service_1.db.client.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        released: true,
                        releasedAt: new Date(),
                        verified: true,
                        verifiedAt: new Date()
                    }
                });
                const newReleasedAmount = (BigInt(escrow.releasedAmount) + BigInt(milestone.amount)).toString();
                await database_service_1.db.client.escrow.update({
                    where: { id },
                    data: {
                        releasedAmount: newReleasedAmount,
                        status: newReleasedAmount === escrow.totalAmount ? 'COMPLETED' : escrow.status
                    }
                });
                // Log activity
                await database_service_1.db.logActivity({
                    escrowId: escrow.id,
                    userAddress: req.user.address,
                    action: 'MILESTONE_RELEASED',
                    details: {
                        milestoneIndex,
                        amount: milestone.amount,
                        releasedBy: 'admin',
                        transactionHash: releaseTx,
                        chain: 'solana-devnet'
                    }
                });
                res.json({
                    success: true,
                    data: {
                        milestoneIndex,
                        amount: milestone.amount,
                        transactionHash: releaseTx,
                        explorerUrl: `https://explorer.solana.com/tx/${releaseTx}?cluster=devnet`
                    }
                });
                return;
            }
            catch (solanaError) {
                console.error('[Solana Release] Error:', solanaError);
                console.error('[Solana Release] Error details:', {
                    message: solanaError.message,
                    logs: solanaError.logs,
                    code: solanaError.code
                });
                // Still update database but mark as pending
                await database_service_1.db.client.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        verified: true,
                        verifiedAt: new Date()
                    }
                });
                res.status(500).json({
                    success: false,
                    error: `Solana transaction failed: ${solanaError.message}`,
                    details: {
                        message: solanaError.message,
                        logs: solanaError.logs,
                        approved: true,
                        note: 'The milestone has been approved in the database but requires manual blockchain release.'
                    }
                });
                return;
            }
        }
        else if (escrow.chain === 'base-sepolia' || escrow.chain === 'base-mainnet') {
            // For Base/EVM escrows, execute on-chain transaction
            console.log('[Base Release] Processing Base/EVM escrow...');
            if (!escrow.contractAddress || escrow.contractAddress === '0x0000000000000000000000000000000000000000') {
                // If no contract address, just update database
                await database_service_1.db.client.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        released: true,
                        releasedAt: new Date(),
                        verified: true,
                        verifiedAt: new Date()
                    }
                });
                const newReleasedAmount = (BigInt(escrow.releasedAmount) + BigInt(milestone.amount)).toString();
                await database_service_1.db.client.escrow.update({
                    where: { id },
                    data: {
                        releasedAmount: newReleasedAmount,
                        status: newReleasedAmount === escrow.totalAmount ? 'COMPLETED' : escrow.status
                    }
                });
                res.json({
                    success: true,
                    data: {
                        milestoneIndex,
                        amount: milestone.amount,
                        note: 'This escrow is not deployed on-chain yet'
                    }
                });
                return;
            }
            try {
                let releaseTransactionHash = transactionHash;
                // If skipBlockchain is true, we already did the blockchain release on frontend
                if (!skipBlockchain) {
                    // Use contract service to release on-chain
                    const { getContractService } = await Promise.resolve().then(() => __importStar(require('../services/contract.service')));
                    const contractService = getContractService();
                    console.log(`[Base Release] Calling contract release for escrow ${escrow.contractAddress}, milestone ${milestoneIndex}`);
                    const releaseResult = await contractService.releaseAndTransferPayment(escrow.contractAddress, milestoneIndex, req.user.address);
                    if (!releaseResult.success) {
                        throw new Error(releaseResult.error || 'Failed to release on-chain');
                    }
                    console.log('[Base Release] On-chain release successful:', releaseResult.transactionHash);
                    releaseTransactionHash = releaseResult.transactionHash;
                }
                else {
                    console.log('[Base Release] Skipping blockchain call, already released on frontend:', transactionHash);
                }
                // Update database
                await database_service_1.db.client.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        released: true,
                        releasedAt: new Date(),
                        verified: true,
                        verifiedAt: new Date()
                    }
                });
                const newReleasedAmount = (BigInt(escrow.releasedAmount) + BigInt(milestone.amount)).toString();
                await database_service_1.db.client.escrow.update({
                    where: { id },
                    data: {
                        releasedAmount: newReleasedAmount,
                        status: newReleasedAmount === escrow.totalAmount ? 'COMPLETED' : escrow.status
                    }
                });
                // Log activity
                await database_service_1.db.logActivity({
                    escrowId: escrow.id,
                    userAddress: req.user.address,
                    action: 'MILESTONE_RELEASED',
                    details: {
                        milestoneIndex,
                        amount: milestone.amount,
                        releasedBy: isAdmin ? 'admin' : 'project_owner',
                        transactionHash: releaseTransactionHash,
                        chain: escrow.chain
                    }
                });
                res.json({
                    success: true,
                    data: {
                        milestoneIndex,
                        amount: milestone.amount,
                        transactionHash: releaseTransactionHash,
                        explorerUrl: escrow.chain === 'base-sepolia'
                            ? `https://sepolia.basescan.org/tx/${releaseTransactionHash}`
                            : `https://basescan.org/tx/${releaseTransactionHash}`,
                        note: skipBlockchain
                            ? 'Milestone database updated to reflect on-chain state.'
                            : 'Milestone released on-chain. The KOL can now claim their payment.'
                    }
                });
            }
            catch (baseError) {
                console.error('[Base Release] Error:', baseError);
                // Still update database but mark as pending
                await database_service_1.db.client.milestone.update({
                    where: { id: milestone.id },
                    data: {
                        verified: true,
                        verifiedAt: new Date()
                    }
                });
                res.status(500).json({
                    success: false,
                    error: `Base transaction failed: ${baseError.message}`,
                    details: {
                        message: baseError.message,
                        approved: true,
                        note: 'The milestone has been approved in the database. To release on-chain, the project owner must call the release function from their wallet, or the factory admin must call adminReleaseMilestone.',
                        factoryAdmin: '0x25EDb55571A963E0A4910fD59f44226Ed7eB0C00',
                        escrowAddress: escrow.contractAddress,
                        milestoneIndex
                    }
                });
                return;
            }
        }
        else {
            // For other off-chain escrows, just update database
            await database_service_1.db.client.milestone.update({
                where: { id: milestone.id },
                data: {
                    released: true,
                    releasedAt: new Date(),
                    verified: true,
                    verifiedAt: new Date()
                }
            });
            // Update escrow released amount
            const newReleasedAmount = (BigInt(escrow.releasedAmount) + BigInt(milestone.amount)).toString();
            await database_service_1.db.client.escrow.update({
                where: { id },
                data: {
                    releasedAmount: newReleasedAmount,
                    status: newReleasedAmount === escrow.totalAmount ? 'COMPLETED' : escrow.status
                }
            });
            // Log activity
            await database_service_1.db.logActivity({
                escrowId: escrow.id,
                userAddress: req.user.address,
                action: 'MILESTONE_RELEASED',
                details: {
                    milestoneIndex,
                    amount: milestone.amount,
                    releasedBy: isAdmin ? 'admin' : 'project_owner',
                    note: 'Off-chain release - no blockchain transaction'
                }
            });
            res.json({
                success: true,
                data: {
                    milestoneIndex,
                    amount: milestone.amount,
                    note: 'Off-chain escrow - database only'
                }
            });
        }
    }
    catch (error) {
        console.error('Release milestone error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to release milestone'
        });
    }
});
// Claim payments (KOL only)
router.post('/:id/claim', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Validate escrow address
        if (!id || id.length !== 42 || !id.startsWith('0x')) {
            res.status(400).json({
                success: false,
                error: 'Invalid escrow address'
            });
            return;
        }
        // Get escrow from database
        const escrowData = await database_service_1.db.getEscrowByAddress(id, req.chain?.slug || 'base-sepolia');
        if (!escrowData) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Verify KOL
        if (escrowData.kolAddress.toLowerCase() !== req.user.address.toLowerCase()) {
            res.status(403).json({
                success: false,
                error: 'Only KOL can claim payments'
            });
            return;
        }
        // Calculate claimable amount from released milestones
        const claimableAmount = escrowData.milestones
            .filter(m => m.released && !m.verified) // verified means claimed
            .reduce((sum, m) => sum + BigInt(m.amount), BigInt(0))
            .toString();
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: escrowData.id,
            userAddress: req.user.address,
            action: 'CLAIM_REQUESTED',
            details: { claimableAmount },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        // Execute claim
        // Note: This would typically be done from frontend with user's wallet
        // Here we're just validating and returning the necessary data
        res.json({
            success: true,
            message: 'Please execute claim transaction from your wallet',
            escrowAddress: id,
            claimableAmount,
            milestones: escrowData.milestones.filter(m => m.released && !m.verified),
        });
    }
    catch (error) {
        console.error('Claim payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process claim'
        });
    }
});
// Get escrow activities
router.get('/:id/activities', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Escrow ID is required'
            });
            return;
        }
        // Get escrow to check access
        const escrow = await database_service_1.db.client.escrow.findUnique({
            where: {
                chain_contractAddress: {
                    chain: req.chain?.slug || 'base-sepolia',
                    contractAddress: id.toLowerCase()
                }
            },
            select: {
                id: true,
                projectAddress: true,
                kolAddress: true,
                verifiers: { select: { address: true } }
            }
        });
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Check access
        const userAddress = req.user.address.toLowerCase();
        const isProjectOwner = escrow.projectAddress.toLowerCase() === userAddress;
        const isKOL = escrow.kolAddress.toLowerCase() === userAddress;
        const isVerifier = escrow.verifiers.some(v => v.address.toLowerCase() === userAddress);
        const isAdmin = req.user.role === 'admin';
        if (!isProjectOwner && !isKOL && !isVerifier && !isAdmin) {
            res.status(403).json({
                success: false,
                error: 'Access denied'
            });
            return;
        }
        // Get activities with user details
        const activities = await database_service_1.db.client.activity.findMany({
            where: { escrowId: escrow.id },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        address: true,
                        name: true,
                        avatar: true,
                    }
                }
            }
        });
        res.json({
            success: true,
            data: activities
        });
    }
    catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activities'
        });
    }
});
// Submit milestone deliverable
router.post('/:id/submissions', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { milestoneIndex, deliveryProof } = req.body;
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const kolAddress = req.user.address.startsWith('0x') ? req.user.address.toLowerCase() : req.user.address;
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Escrow ID is required'
            });
            return;
        }
        // Validate inputs
        if (!deliveryProof || typeof milestoneIndex !== 'number') {
            res.status(400).json({
                success: false,
                error: 'Delivery proof and milestone index are required'
            });
            return;
        }
        // Handle different ID types
        const isCuid = /^[a-z0-9]{25}$/i.test(id);
        const chain = req.chain?.slug || 'base-sepolia';
        console.log('[Submit Proof] Request params:', {
            id,
            isCuid,
            chain,
            kolAddress,
            milestoneIndex,
            userAddress: req.user.address
        });
        let escrow;
        if (isCuid) {
            escrow = await database_service_1.db.client.escrow.findFirst({
                where: {
                    id,
                    kolAddress,
                },
                include: {
                    milestones: {
                        where: { milestoneIndex }
                    }
                },
            });
        }
        else {
            // For address-based lookup
            const searchAddress = chain.includes('solana') && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(id)
                ? convertToEvmAddress(id)
                : id;
            escrow = await database_service_1.db.client.escrow.findFirst({
                where: {
                    chain,
                    contractAddress: chain.includes('solana') ? searchAddress : searchAddress.toLowerCase(),
                    kolAddress,
                },
                include: {
                    milestones: {
                        where: { milestoneIndex }
                    }
                },
            });
        }
        if (!escrow || escrow.milestones.length === 0) {
            console.log('[Submit Proof] Escrow search result:', {
                found: !!escrow,
                milestoneCount: escrow?.milestones?.length || 0,
                escrowId: escrow?.id,
                escrowKolAddress: escrow?.kolAddress
            });
            res.status(404).json({
                success: false,
                error: 'Escrow or milestone not found'
            });
            return;
        }
        const milestone = escrow.milestones[0];
        if (!milestone) {
            res.status(404).json({
                success: false,
                error: 'Milestone not found'
            });
            return;
        }
        // Check if milestone can be submitted
        if (milestone.released) {
            res.status(400).json({
                success: false,
                error: 'Milestone already released'
            });
            return;
        }
        // Check for existing submission
        const existingSubmission = await database_service_1.db.client.milestoneSubmission.findFirst({
            where: {
                milestoneId: milestone.id,
                status: { in: ['PENDING', 'APPROVED'] }
            }
        });
        if (existingSubmission) {
            res.status(400).json({
                success: false,
                error: 'Milestone already has a pending or approved submission'
            });
            return;
        }
        // Create submission
        const submission = await database_service_1.db.client.milestoneSubmission.create({
            data: {
                milestoneId: milestone.id,
                kolAddress,
                description: deliveryProof,
                proofType: 'LINK',
                proofUrl: '',
                status: 'PENDING',
            }
        });
        // Update milestone verification status
        await database_service_1.db.client.milestone.update({
            where: { id: milestone.id },
            data: {
                verificationStatus: 'PENDING',
                updatedAt: new Date(),
            }
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: escrow.id,
            userAddress: kolAddress,
            action: 'DELIVERABLE_SUBMITTED',
            details: {
                milestoneId: milestone.milestoneIndex,
                milestoneTitle: milestone.title,
                submissionId: submission.id,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        // Emit websocket event
        (0, websocket_service_1.emitWebSocketEvent)('milestone:submitted', {
            escrowAddress: escrow.contractAddress,
            milestoneId: milestone.milestoneIndex,
            kolAddress,
            submissionId: submission.id,
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.json({
            success: true,
            message: 'Deliverable submitted successfully',
            submissionId: submission.id,
        });
    }
    catch (error) {
        console.error('Submit deliverable error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit deliverable'
        });
    }
});
// Create dispute (Project owner only)
router.post('/:id/disputes', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { milestoneIndex, submissionId, disputeType, description } = req.body;
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Escrow ID is required'
            });
            return;
        }
        // Validate inputs
        if (typeof milestoneIndex !== 'number' || !submissionId || !disputeType || !description) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
            return;
        }
        // Handle different ID types
        const isCuid = /^[a-z0-9]{25}$/i.test(id);
        const chain = req.chain?.slug || 'base-sepolia';
        let escrow;
        if (isCuid) {
            escrow = await database_service_1.db.client.escrow.findFirst({
                where: { id },
                include: {
                    milestones: {
                        where: { milestoneIndex },
                        include: {
                            submissions: {
                                where: { id: submissionId }
                            }
                        }
                    }
                },
            });
        }
        else {
            // For address-based lookup
            const searchAddress = chain.includes('solana') && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(id)
                ? convertToEvmAddress(id)
                : id;
            escrow = await database_service_1.db.client.escrow.findFirst({
                where: {
                    chain,
                    contractAddress: searchAddress.toLowerCase(),
                },
                include: {
                    milestones: {
                        where: { milestoneIndex },
                        include: {
                            submissions: {
                                where: { id: submissionId }
                            }
                        }
                    }
                },
            });
        }
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Check if user is project owner
        if (escrow.projectAddress.toLowerCase() !== req.user.address.toLowerCase()) {
            res.status(403).json({
                success: false,
                error: 'Only project owner can raise disputes'
            });
            return;
        }
        const milestone = escrow.milestones[0];
        if (!milestone || !milestone.submissions[0]) {
            res.status(404).json({
                success: false,
                error: 'Milestone or submission not found'
            });
            return;
        }
        // Check if milestone is already released
        if (milestone.released) {
            res.status(400).json({
                success: false,
                error: 'Cannot dispute a released milestone'
            });
            return;
        }
        // Create dispute
        const dispute = await database_service_1.db.client.dispute.create({
            data: {
                escrowId: escrow.id,
                disputeType,
                raisedBy: req.user.address,
                reason: description,
                status: 'OPEN',
            }
        });
        // Update submission status
        await database_service_1.db.client.milestoneSubmission.update({
            where: { id: submissionId },
            data: {
                status: 'DISPUTED',
                updatedAt: new Date(),
            }
        });
        // Update milestone verification status
        await database_service_1.db.client.milestone.update({
            where: { id: milestone.id },
            data: {
                verificationStatus: 'DISPUTED',
                updatedAt: new Date(),
            }
        });
        // Update escrow status if not already disputed
        if (escrow.status !== 'DISPUTED') {
            await database_service_1.db.client.escrow.update({
                where: { id: escrow.id },
                data: {
                    status: 'DISPUTED',
                    updatedAt: new Date(),
                }
            });
        }
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: escrow.id,
            userAddress: req.user.address,
            action: 'ESCROW_DISPUTED',
            details: {
                milestoneId: milestone.milestoneIndex,
                milestoneTitle: milestone.title,
                disputeType,
                reason: description,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        // Clear cache
        cache_service_1.escrowCache.delete(`escrow:${id}`);
        // Emit WebSocket event
        (0, websocket_service_1.emitWebSocketEvent)('escrow:disputed', {
            escrowAddress: id,
            milestoneId: milestone.milestoneIndex,
            disputeId: dispute.id,
            raisedBy: req.user.address,
            kolAddress: escrow.kolAddress,
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.status(201).json({
            success: true,
            message: 'Dispute raised successfully',
            disputeId: dispute.id,
        });
    }
    catch (error) {
        console.error('Create dispute error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create dispute'
        });
    }
});
// Sync Solana escrow from blockchain
router.post('/sync', auth_middleware_1.authenticate, async (req, res) => {
    try {
        console.log('Sync endpoint called with body:', JSON.stringify(req.body, null, 2));
        const { escrowId, escrowPda, signature, chain } = req.body;
        if (!escrowId || !escrowPda || !signature || !chain) {
            console.error('Missing required fields:', { escrowId: !!escrowId, escrowPda: !!escrowPda, signature: !!signature, chain: !!chain });
            res.status(400).json({
                success: false,
                error: 'Missing required fields',
                details: { escrowId: !!escrowId, escrowPda: !!escrowPda, signature: !!signature, chain: !!chain }
            });
            return;
        }
        // Handle addresses based on chain type
        const isSolanaChain = chain === 'solana-devnet' || chain === 'solana-mainnet';
        const contractAddress = isSolanaChain ? escrowPda : convertToEvmAddress(escrowPda);
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Check if escrow already exists by chainEscrowId
        const chainId = chain === 'solana-devnet' ? '901' : '900';
        const existingEscrow = await database_service_1.db.client.escrow.findFirst({
            where: {
                chainId,
                chainEscrowId: escrowId.toString(),
            },
        });
        if (existingEscrow) {
            // Fetch with all relations
            const escrowWithRelations = await database_service_1.db.getEscrowById(existingEscrow.id);
            // Convert BigInt fields to strings for JSON serialization
            const serializedEscrow = {
                ...escrowWithRelations,
                blockNumber: escrowWithRelations.blockNumber?.toString() || '0',
                milestones: escrowWithRelations.milestones?.map((m) => ({
                    ...m,
                    // Convert any BigInt fields in milestones if needed
                }))
            };
            res.status(200).json({
                success: true,
                message: 'Escrow already synced',
                data: {
                    escrow: serializedEscrow
                }
            });
            return;
        }
        // Ensure users exist in database
        const projectAddress = isSolanaChain ? user.address : convertToEvmAddress(user.address);
        const kolAddress = isSolanaChain ? (req.body.recipient || '') : convertToEvmAddress(req.body.recipient || '');
        // Create users if they don't exist
        await database_service_1.db.client.user.upsert({
            where: { address: projectAddress },
            update: {},
            create: {
                address: projectAddress,
                role: 'team',
                chainType: 'solana',
            },
        });
        await database_service_1.db.client.user.upsert({
            where: { address: kolAddress },
            update: {},
            create: {
                address: kolAddress,
                role: 'kol',
                chainType: 'solana',
            },
        });
        // Check if escrow already exists with this chain ID to prevent duplicates
        const duplicateEscrow = await database_service_1.db.client.escrow.findFirst({
            where: {
                chainEscrowId: escrowId.toString(),
                chain: chain,
            }
        });
        if (duplicateEscrow) {
            console.log('Escrow already exists with chain ID:', escrowId, 'DB ID:', duplicateEscrow.id);
            res.json({
                success: true,
                message: 'Escrow already synced',
                data: {
                    escrow: duplicateEscrow,
                    escrowId: duplicateEscrow.id
                }
            });
            return;
        }
        // For Solana, we'll fetch the escrow data from the chain
        // This is a placeholder - in production, you'd use the Solana SDK
        const escrowData = {
            chain,
            chainId,
            chainEscrowId: escrowId.toString(), // Ensure it's a string
            contractAddress,
            projectAddress,
            kolAddress,
            tokenAddress: isSolanaChain ? (req.body.tokenMint || '') : convertToEvmAddress(req.body.tokenMint || ''),
            totalAmount: req.body.totalAmount || '0',
            releasedAmount: '0',
            status: 'ACTIVE',
            requireVerification: req.body.requiresAdminApproval || false,
            transactionHash: signature,
            // Default values for required fields
            factoryAddress: '0x0000000000000000000000000000000000000000',
            blockNumber: BigInt(0),
            projectName: req.body.projectName || 'Solana Escrow',
            dealType: 'Other',
            dealDescription: req.body.description || '',
            startDate: req.body.startTime ? new Date(parseInt(req.body.startTime) * 1000) : new Date(),
            endDate: req.body.endTime ? new Date(parseInt(req.body.endTime) * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            tokenSymbol: req.body.tokenSymbol || 'SOL',
            tokenDecimals: parseInt(req.body.tokenDecimals) || 9,
            requirements: [], // Required field
            adminControlled: req.body.requiresAdminApproval || false,
            claimedAmount: '0',
            escrowTokenAccount: req.body.escrowTokenAccount || null, // Store the token account address
        };
        // Debug log the data being created
        console.log('Creating escrow with data:', JSON.stringify(escrowData, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
        let escrow;
        try {
            // Create escrow in database
            escrow = await database_service_1.db.client.escrow.create({
                data: escrowData,
            });
            console.log('Escrow created successfully with ID:', escrow.id);
        }
        catch (dbError) {
            console.error('Database error creating escrow:', dbError);
            console.error('Error code:', dbError.code);
            console.error('Error meta:', dbError.meta);
            throw dbError;
        }
        // Create milestones if provided
        if (req.body.milestones && Array.isArray(req.body.milestones)) {
            console.log('Creating milestones:', JSON.stringify(req.body.milestones, null, 2));
            console.log('Total amount for escrow:', escrowData.totalAmount);
            const totalAmount = BigInt(escrowData.totalAmount);
            for (let i = 0; i < req.body.milestones.length; i++) {
                const milestone = req.body.milestones[i];
                const milestoneAmount = milestone.amount || '0';
                console.log(`Processing milestone ${i}:`, {
                    rawAmount: milestone.amount,
                    milestoneAmount: milestoneAmount,
                    description: milestone.description
                });
                // Calculate percentage from amount if not provided
                let percentage = milestone.percentage || 0;
                if (!milestone.percentage && totalAmount > 0n) {
                    percentage = (Number(BigInt(milestoneAmount) * 10000n / totalAmount) / 100);
                }
                console.log(`Creating milestone ${i}:`, {
                    title: milestone.title || `Milestone ${i + 1}`,
                    description: milestone.description || '',
                    amount: milestoneAmount,
                    percentage,
                    releaseDate: milestone.dueDate,
                });
                await database_service_1.db.client.milestone.create({
                    data: {
                        escrowId: escrow.id,
                        milestoneIndex: i,
                        title: milestone.title || `Milestone ${i + 1}`,
                        description: milestone.description || '',
                        amount: milestoneAmount,
                        percentage: percentage,
                        releaseDate: milestone.dueDate ? new Date(milestone.dueDate * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        released: false,
                        verified: false,
                    },
                });
            }
        }
        else {
            // Create default milestone if none provided
            await database_service_1.db.client.milestone.create({
                data: {
                    escrowId: escrow.id,
                    milestoneIndex: 0,
                    title: 'Full Payment',
                    description: 'Complete payment upon completion',
                    amount: escrowData.totalAmount,
                    percentage: 100,
                    releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    released: false,
                    verified: false,
                },
            });
        }
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: escrow.id,
            userAddress: user.address,
            action: 'ESCROW_CREATED',
            details: {
                escrowId,
                escrowPda,
                signature,
                chain,
            },
            chain: chain,
        });
        // Fetch the escrow with milestones
        const escrowWithMilestones = await database_service_1.db.getEscrowById(escrow.id);
        // Convert BigInt fields to strings for JSON serialization
        const serializedEscrow = {
            ...escrowWithMilestones,
            blockNumber: escrowWithMilestones.blockNumber?.toString() || '0',
            milestones: escrowWithMilestones.milestones?.map((m) => ({
                ...m,
                // Convert any BigInt fields in milestones if needed
            }))
        };
        res.status(201).json({
            success: true,
            message: 'Escrow synced successfully',
            data: {
                escrow: serializedEscrow
            }
        });
    }
    catch (error) {
        console.error('Sync escrow error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            meta: error.meta
        });
        res.status(500).json({
            success: false,
            error: 'Failed to sync escrow',
            details: error.message,
            code: error.code,
            meta: process.env.NODE_ENV === 'development' ? error.meta : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Get next escrow ID for Solana
router.get('/next-id', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { chain } = req.query;
        if (!chain || !chain.toString().startsWith('solana')) {
            res.status(400).json({ error: 'Invalid chain for next ID' });
            return;
        }
        // Get the count of Solana escrows to generate next ID
        const chainId = chain === 'solana-devnet' ? '901' : '900';
        const count = await database_service_1.db.client.escrow.count({
            where: {
                chainId: {
                    in: ['900', '901'], // Both Solana chain IDs
                },
            },
        });
        // Use timestamp + count to ensure uniqueness
        const nextId = Date.now() * 1000 + count;
        res.json({
            success: true,
            data: { nextId }
        });
    }
    catch (error) {
        console.error('Get next ID error:', error);
        res.status(500).json({
            error: 'Failed to get next ID',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=escrow.routes.js.map