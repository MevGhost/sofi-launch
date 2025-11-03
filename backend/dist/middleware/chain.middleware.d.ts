import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to handle chain-specific headers and parameters
 */
export interface ChainRequest extends Request {
    chain?: {
        slug: string;
        type: 'evm' | 'solana';
    };
}
export declare const extractChainInfo: (req: ChainRequest, _res: Response, next: NextFunction) => void;
export declare const validateChain: (supportedChains: string[]) => (req: ChainRequest, res: Response, next: NextFunction) => void;
export declare const attachChainToResponse: (req: ChainRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=chain.middleware.d.ts.map