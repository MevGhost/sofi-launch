import { CreateEscrowDto, TransactionResult } from '../types';
export declare class ContractService {
    private provider;
    private signer;
    private factoryContract;
    private tokenFactoryContract;
    private bondingCurveAddress;
    constructor();
    prepareDeployEscrow(dto: CreateEscrowDto): Promise<any>;
    deployEscrow(dto: CreateEscrowDto): Promise<TransactionResult>;
    releasePayment(escrowAddress: string, milestoneId: number, callerAddress: string): Promise<TransactionResult>;
    releaseAndTransferPayment(escrowAddress: string, milestoneId: number, callerAddress: string): Promise<TransactionResult>;
    clawbackFunds(escrowAddress: string): Promise<TransactionResult>;
    getEscrowDetails(escrowAddress: string): Promise<any>;
    private getVerificationThreshold;
    private calculateStatus;
    deployToken(params: {
        name: string;
        symbol: string;
        totalSupply?: string;
        bondingCurveType?: string;
        creator?: string;
        description?: string;
        imageUrl?: string;
        twitter?: string;
        telegram?: string;
        website?: string;
        category?: string;
    }): Promise<TransactionResult>;
    getTokenData(tokenAddress: string): Promise<any>;
    buyTokens(params: {
        tokenAddress: string;
        amount: string;
        minTokensOut: string;
    }): Promise<TransactionResult>;
    sellTokens(params: {
        tokenAddress: string;
        tokenAmount: string;
        minEthOut: string;
    }): Promise<TransactionResult>;
}
export declare const getContractService: () => ContractService;
export declare const contractService: {
    readonly deployEscrow: any;
    readonly releasePayment: any;
    readonly releaseAndTransferPayment: any;
    readonly clawbackFunds: any;
    readonly getEscrowDetails: any;
    readonly deployToken: any;
    readonly getTokenData: any;
    readonly buyTokens: any;
    readonly sellTokens: any;
};
//# sourceMappingURL=contract.service.d.ts.map