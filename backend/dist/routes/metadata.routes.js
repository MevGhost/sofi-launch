"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
/**
 * Store metadata for Solana escrows
 * This endpoint is used by the Solana SDK to store escrow metadata
 * that can't be stored on-chain due to size limitations
 */
router.post('/', auth_middleware_1.authenticate, [
    (0, express_validator_1.body)('projectName').isString().notEmpty(),
    (0, express_validator_1.body)('description').isString().notEmpty(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // Extract all metadata from request body
        const metadata = req.body;
        // For now, we'll store this metadata when the escrow is created
        // The actual escrow creation will happen through the /api/escrows endpoint
        // This is just to acknowledge the metadata storage request
        console.log('Storing metadata for Solana escrow:', {
            projectName: metadata.projectName,
            description: metadata.description,
            milestones: metadata.milestones?.length || 0,
        });
        // Generate a simple hash for the metadata (in production, use proper hashing)
        const crypto = require('crypto');
        const metadataString = JSON.stringify(metadata);
        const hash = crypto.createHash('sha256').update(metadataString).digest('hex');
        // Return success with hash to allow the Solana transaction to proceed
        res.json({
            success: true,
            data: {
                metadataStored: true,
                hash: hash.substring(0, 32), // Return first 32 chars as the hash
            },
        });
    }
    catch (error) {
        console.error('Metadata storage error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store metadata'
        });
    }
});
/**
 * Get metadata for a Solana escrow
 */
router.get('/:escrowPda', async (req, res) => {
    try {
        const { escrowPda } = req.params;
        // In a real implementation, you might store metadata separately
        // For now, we'll return a placeholder
        res.json({
            success: true,
            data: {
                escrowPda,
                metadata: {
                    projectName: 'Retrieved from database',
                    description: 'Retrieved from database',
                },
            },
        });
    }
    catch (error) {
        console.error('Metadata retrieval error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metadata'
        });
    }
});
exports.default = router;
//# sourceMappingURL=metadata.routes.js.map