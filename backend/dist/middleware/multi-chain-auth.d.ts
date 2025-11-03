/**
 * Multi-chain signature verification
 */
export declare const verifyEVMSignature: (message: string, signature: string, expectedAddress: string) => Promise<boolean>;
export declare const verifySolanaSignature: (message: string, signature: string, expectedAddress: string) => Promise<boolean>;
export declare const verifyMultiChainSignature: (message: string, signature: string, expectedAddress: string, chainType: "evm" | "solana") => Promise<boolean>;
export declare const isValidAddress: (address: string, chainType: "evm" | "solana") => boolean;
export declare const generateUserId: (address: string, chainType: "evm" | "solana") => string;
//# sourceMappingURL=multi-chain-auth.d.ts.map