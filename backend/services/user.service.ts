import { UserRole } from '../types';
import { db } from './database.service';

// Get role by address from database
export const getRoleByAddress = async (address: string): Promise<UserRole> => {
  const user = await db.getUserByAddress(address);
  
  console.log(`[getRoleByAddress] Checking role for ${address}:`, {
    userFound: !!user,
    userRole: user?.role,
    isAdmin: user?.role === 'admin'
  });
  
  // Check if user is admin first (highest priority)
  if (user?.role === 'admin') {
    console.log(`[getRoleByAddress] User ${address} is ADMIN`);
    return UserRole.ADMIN;
  }
  
  // Check if user is a KOL in any escrow
  // Only lowercase EVM addresses, keep Solana addresses as-is
  const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
  
  const kolEscrows = await db.client.escrow.findFirst({
    where: {
      kolAddress: normalizedAddress,
    },
  });
  
  if (kolEscrows) {
    console.log(`[getRoleByAddress] User ${address} is KOL (found in escrow)`);
    return UserRole.KOL;
  }
  
  // Check if user is a verifier
  if (user?.role === 'verifier') {
    return UserRole.VERIFIER;
  }
  
  // Default to team role
  console.log(`[getRoleByAddress] User ${address} defaulting to TEAM`);
  return UserRole.TEAM;
};

export const isAdmin = async (address: string): Promise<boolean> => {
  const user = await db.getUserByAddress(address);
  return user?.role === 'admin';
};

export const isKOL = async (address: string): Promise<boolean> => {
  // Check if user is a KOL in any escrow
  // Only lowercase EVM addresses, keep Solana addresses as-is
  const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
  
  const kolEscrows = await db.client.escrow.findFirst({
    where: {
      kolAddress: normalizedAddress,
    },
  });
  return !!kolEscrows;
};

export const isVerifier = async (address: string): Promise<boolean> => {
  // Check if user is a verifier in any active escrow
  // Only lowercase EVM addresses, keep Solana addresses as-is
  const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
  
  const verifierRoles = await db.client.verifier.findMany({
    where: {
      address: normalizedAddress,
      isActive: true,
    },
  });
  return verifierRoles.length > 0;
};

export const isTeam = async (address: string): Promise<boolean> => {
  const user = await db.getUserByAddress(address);
  return user?.role === 'team';
};

// User profile service
export interface UserProfile {
  id: string;
  address: string;
  role: UserRole;
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  createdAt: Date;
  lastActive: Date;
  stats?: {
    totalEscrowsCreated: number;
    totalEscrowsAsKol: number;
    totalEscrowsAsVerifier: number;
    totalValueLocked: string;
  };
}

export const getUserProfile = async (address: string): Promise<UserProfile | null> => {
  try {
    const user = await db.getUserByAddress(address);
    if (!user) {
      return null;
    }

    const role = await getRoleByAddress(address);
    
    // Calculate stats
    // Only lowercase EVM addresses, keep Solana addresses as-is
    const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    
    const [createdCount, kolCount, verifierCount] = await Promise.all([
      db.client.escrow.count({ where: { projectAddress: normalizedAddress } }),
      db.client.escrow.count({ where: { kolAddress: normalizedAddress } }),
      db.client.verifier.count({ 
        where: { 
          address: normalizedAddress,
          isActive: true,
        } 
      }),
    ]);

    // Calculate total value locked (simplified - in production, aggregate from blockchain)
    const escrows = await db.client.escrow.findMany({
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
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (
  address: string,
  updates: Partial<{
    name: string;
    email: string;
    avatar: string;
    bio: string;
  }>
): Promise<UserProfile | null> => {
  try {
    // Only lowercase EVM addresses, keep Solana addresses as-is
    const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    
    await db.client.user.update({
      where: { address: normalizedAddress },
      data: {
        ...updates,
        lastLogin: new Date(),
      },
    });
    
    return getUserProfile(address);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
};

// Create or update user on login
export const createOrUpdateUser = async (address: string) => {
  return db.findOrCreateUser(address, {
    lastLogin: new Date(),
  });
};

// Get user nonce for authentication
export const getUserNonce = async (address: string): Promise<string | null> => {
  // Only lowercase EVM addresses, keep Solana addresses as-is
  const normalizedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
  
  const user = await db.client.user.findUnique({
    where: { address: normalizedAddress },
    select: { nonce: true },
  });
  return user?.nonce || null;
};

// Update user nonce
export const updateUserNonce = async (address: string, nonce: string) => {
  return db.updateUserNonce(address, nonce);
};