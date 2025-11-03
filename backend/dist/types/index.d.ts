import { Request } from 'express';
export interface AuthRequest extends Request {
    user?: {
        address: string;
        role: UserRole;
        userId: string;
        id?: string;
    };
}
export declare enum UserRole {
    ADMIN = "admin",
    TEAM = "team",
    KOL = "kol",
    VERIFIER = "verifier"
}
export interface CreateEscrowDto {
    dealBasics: {
        projectName: string;
        dealType: string;
        customDealType?: string;
        kolName: string;
        kolAddress: string;
        tokenAddress: string;
        tokenSymbol: string;
        tokenDecimals: number;
        startDate: string;
        endDate: string;
        dealDescription: string;
    };
    milestones: Array<{
        title: string;
        description: string;
        amount: number;
        percentage: number;
        releaseDate: string;
        conditions: string[];
    }>;
    verificationSettings: {
        requireVerification: boolean;
        verificationMethod: 'single' | 'majority' | 'unanimous';
        verifierAddresses: string[];
        disputeResolutionMethod: 'admin' | 'dao' | 'arbitrator';
        arbitratorAddress?: string;
    };
    signature: string;
    deployerAddress: string;
}
export interface EscrowStatus {
    id: string;
    address: string;
    projectName: string;
    kolAddress: string;
    totalAmount: string;
    releasedAmount: string;
    status: 'active' | 'completed' | 'disputed' | 'cancelled';
    milestones: Array<{
        id: number;
        amount: string;
        releaseDate: string;
        released: boolean;
        verified: boolean;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReleasePaymentDto {
    milestoneId: number;
    verifierSignatures?: Array<{
        address: string;
        signature: string;
    }>;
}
export interface TransactionResult {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
    tokenAddress?: string;
    tokenAmount?: string;
    ethAmount?: string;
    [key: string]: any;
}
//# sourceMappingURL=index.d.ts.map