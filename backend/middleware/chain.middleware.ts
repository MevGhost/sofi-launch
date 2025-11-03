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

// Extract chain information from request
export const extractChainInfo = (req: ChainRequest, _res: Response, next: NextFunction): void => {
  try {
    // Get chain info from headers or query params
    const chainFromHeader = req.headers['x-chain'] as string;
    const chainTypeFromHeader = req.headers['x-chain-type'] as string;
    const chainFromQuery = req.query.chain as string;
    const chainFromBody = req.body?.chain as string;

    // Priority: header > body > query
    const chainSlug = chainFromHeader || chainFromBody || chainFromQuery || 'base-sepolia';
    const chainType = (chainTypeFromHeader || (chainSlug.includes('solana') ? 'solana' : 'evm')) as 'evm' | 'solana';

    // Attach to request
    req.chain = {
      slug: chainSlug,
      type: chainType,
    };

    next();
  } catch (error) {
    console.error('Chain middleware error:', error);
    next();
  }
};

// Validate chain is supported
export const validateChain = (supportedChains: string[]) => {
  return (req: ChainRequest, res: Response, next: NextFunction): void => {
    if (!req.chain || !supportedChains.includes(req.chain.slug)) {
      res.status(400).json({ 
        error: 'Unsupported chain',
        supportedChains 
      });
      return;
    }
    next();
  };
};

// Add chain to response locals for logging
export const attachChainToResponse = (req: ChainRequest, res: Response, next: NextFunction): void => {
  if (req.chain) {
    res.locals.chain = req.chain;
  }
  next();
};