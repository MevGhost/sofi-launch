"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachChainToResponse = exports.validateChain = exports.extractChainInfo = void 0;
// Extract chain information from request
const extractChainInfo = (req, _res, next) => {
    try {
        // Get chain info from headers or query params
        const chainFromHeader = req.headers['x-chain'];
        const chainTypeFromHeader = req.headers['x-chain-type'];
        const chainFromQuery = req.query.chain;
        const chainFromBody = req.body?.chain;
        // Priority: header > body > query
        const chainSlug = chainFromHeader || chainFromBody || chainFromQuery || 'base-sepolia';
        const chainType = (chainTypeFromHeader || (chainSlug.includes('solana') ? 'solana' : 'evm'));
        // Attach to request
        req.chain = {
            slug: chainSlug,
            type: chainType,
        };
        next();
    }
    catch (error) {
        console.error('Chain middleware error:', error);
        next();
    }
};
exports.extractChainInfo = extractChainInfo;
// Validate chain is supported
const validateChain = (supportedChains) => {
    return (req, res, next) => {
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
exports.validateChain = validateChain;
// Add chain to response locals for logging
const attachChainToResponse = (req, res, next) => {
    if (req.chain) {
        res.locals.chain = req.chain;
    }
    next();
};
exports.attachChainToResponse = attachChainToResponse;
//# sourceMappingURL=chain.middleware.js.map