import { UserRole } from '../types';
export declare const getRoleByAddress: (address: string) => Promise<UserRole>;
export declare const isAdmin: (address: string) => Promise<boolean>;
export declare const isKOL: (address: string) => Promise<boolean>;
export declare const isVerifier: (address: string) => Promise<boolean>;
export declare const isTeam: (address: string) => Promise<boolean>;
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
export declare const getUserProfile: (address: string) => Promise<UserProfile | null>;
export declare const updateUserProfile: (address: string, updates: Partial<{
    name: string;
    email: string;
    avatar: string;
    bio: string;
}>) => Promise<UserProfile | null>;
export declare const createOrUpdateUser: (address: string) => Promise<{
    name: string | null;
    id: string;
    address: string;
    nonce: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date | null;
    email: string | null;
    avatar: string | null;
    bio: string | null;
    department: string | null;
    lastActive: Date;
    role: string;
    chainType: string;
}>;
export declare const getUserNonce: (address: string) => Promise<string | null>;
export declare const updateUserNonce: (address: string, nonce: string) => Promise<{
    name: string | null;
    id: string;
    address: string;
    nonce: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date | null;
    email: string | null;
    avatar: string | null;
    bio: string | null;
    department: string | null;
    lastActive: Date;
    role: string;
    chainType: string;
}>;
//# sourceMappingURL=user.service.d.ts.map