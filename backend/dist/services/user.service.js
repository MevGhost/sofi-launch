"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserNonce = exports.getUserNonce = exports.createOrUpdateUser = exports.updateUserProfile = exports.getUserProfile = exports.isTeam = exports.isVerifier = exports.isKOL = exports.isAdmin = exports.getRoleByAddress = void 0;
const types_1 = require("../types");
const database_service_1 = require("./database.service");
// Get role by address from database
const getRoleByAddress = async (address) => {
    const user = await database_service_1.db.getUserByAddress(address);
    console.log(`[getRoleByAddress] Checking role for ${address}:`, {
        userFound: !!user,
        userRole: user?.role,
        isAdmin: user?.role === 'admin'
    });
    // Check if user is admin first (highest priority)
    if (user?.role === 'admin') {
        console.log(`[getRoleByAddress] User ${address} is ADMIN`);
        return types_1.UserRole.ADMIN;
    }
    // Check if user is a KOL in any escrow
    // Only lowercase EVM addresses, keep Solana addresses as-is
    const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    const kolEscrows = await database_service_1.db.client.escrow.findFirst({
        where: {
            kolAddress: normalizedAddress,
        },
    });
    if (kolEscrows) {
        console.log(`[getRoleByAddress] User ${address} is KOL (found in escrow)`);
        return types_1.UserRole.KOL;
    }
    // Check if user is a verifier
    if (user?.role === 'verifier') {
        return types_1.UserRole.VERIFIER;
    }
    // Default to team role
    console.log(`[getRoleByAddress] User ${address} defaulting to TEAM`);
    return types_1.UserRole.TEAM;
};
exports.getRoleByAddress = getRoleByAddress;
const isAdmin = async (address) => {
    const user = await database_service_1.db.getUserByAddress(address);
    return user?.role === 'admin';
};
exports.isAdmin = isAdmin;
const isKOL = async (address) => {
    // Check if user is a KOL in any escrow
    // Only lowercase EVM addresses, keep Solana addresses as-is
    const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    const kolEscrows = await database_service_1.db.client.escrow.findFirst({
        where: {
            kolAddress: normalizedAddress,
        },
    });
    return !!kolEscrows;
};
exports.isKOL = isKOL;
const isVerifier = async (address) => {
    // Check if user is a verifier in any active escrow
    // Only lowercase EVM addresses, keep Solana addresses as-is
    const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    const verifierRoles = await database_service_1.db.client.verifier.findMany({
        where: {
            address: normalizedAddress,
            isActive: true,
        },
    });
    return verifierRoles.length > 0;
};
exports.isVerifier = isVerifier;
const isTeam = async (address) => {
    const user = await database_service_1.db.getUserByAddress(address);
    return user?.role === 'team';
};
exports.isTeam = isTeam;
const getUserProfile = async (address) => {
    try {
        const user = await database_service_1.db.getUserByAddress(address);
        if (!user) {
            return null;
        }
        const role = await (0, exports.getRoleByAddress)(address);
        // Calculate stats
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
        const [createdCount, kolCount, verifierCount] = await Promise.all([
            database_service_1.db.client.escrow.count({ where: { projectAddress: normalizedAddress } }),
            database_service_1.db.client.escrow.count({ where: { kolAddress: normalizedAddress } }),
            database_service_1.db.client.verifier.count({
                where: {
                    address: normalizedAddress,
                    isActive: true,
                }
            }),
        ]);
        // Calculate total value locked (simplified - in production, aggregate from blockchain)
        const escrows = await database_service_1.db.client.escrow.findMany({
            where: {
                OR: [
                    { projectAddress: normalizedAddress },
                    { kolAddress: normalizedAddress },
                ],
            },
            select: { totalAmount: true },
        });
        const totalValueLocked = escrows
            .reduce((sum, escrow) => sum + BigInt(escrow.totalAmount), BigInt(0))
            .toString();
        return {
            id: user.id,
            address: user.address,
            role,
            name: user.name || undefined,
            email: user.email || undefined,
            avatar: user.avatar || undefined,
            bio: user.bio || undefined,
            createdAt: user.createdAt,
            lastActive: user.lastLogin || user.updatedAt,
            stats: {
                totalEscrowsCreated: createdCount,
                totalEscrowsAsKol: kolCount,
                totalEscrowsAsVerifier: verifierCount,
                totalValueLocked,
            },
        };
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};
exports.getUserProfile = getUserProfile;
const updateUserProfile = async (address, updates) => {
    try {
        // Only lowercase EVM addresses, keep Solana addresses as-is
        const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
        await database_service_1.db.client.user.update({
            where: { address: normalizedAddress },
            data: {
                ...updates,
                lastLogin: new Date(),
            },
        });
        return (0, exports.getUserProfile)(address);
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        return null;
    }
};
exports.updateUserProfile = updateUserProfile;
// Create or update user on login
const createOrUpdateUser = async (address) => {
    return database_service_1.db.findOrCreateUser(address, {
        lastLogin: new Date(),
    });
};
exports.createOrUpdateUser = createOrUpdateUser;
// Get user nonce for authentication
const getUserNonce = async (address) => {
    // Only lowercase EVM addresses, keep Solana addresses as-is
    const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    const user = await database_service_1.db.client.user.findUnique({
        where: { address: normalizedAddress },
        select: { nonce: true },
    });
    return user?.nonce || null;
};
exports.getUserNonce = getUserNonce;
// Update user nonce
const updateUserNonce = async (address, nonce) => {
    return database_service_1.db.updateUserNonce(address, nonce);
};
exports.updateUserNonce = updateUserNonce;
//# sourceMappingURL=user.service.js.map