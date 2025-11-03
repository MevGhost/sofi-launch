"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const database_service_1 = require("../services/database.service");
const websocket_service_1 = require("../services/websocket.service");
const router = (0, express_1.Router)();
// Get KOL deals
router.get('/deals', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const kolAddress = req.user.address;
        // Get all escrows where user is KOL
        const escrows = await database_service_1.db.client.escrow.findMany({
            where: {
                kolAddress: kolAddress.toLowerCase(),
                chain: req.chain?.slug || 'base-sepolia',
            },
            include: {
                milestones: {
                    include: {
                        submissions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        }
                    }
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        // Format the response
        const formattedDeals = escrows.map(escrow => ({
            id: escrow.id,
            escrowAddress: escrow.contractAddress,
            projectName: escrow.projectName,
            projectAddress: escrow.projectAddress,
            totalAmount: escrow.totalAmount,
            releasedAmount: escrow.releasedAmount || '0',
            claimedAmount: escrow.claimedAmount || '0',
            tokenSymbol: escrow.tokenSymbol,
            tokenDecimals: escrow.tokenDecimals,
            status: escrow.status.toLowerCase(),
            createdAt: escrow.createdAt.toISOString(),
            milestones: escrow.milestones.map(m => ({
                id: m.milestoneIndex,
                title: m.title,
                description: m.description,
                amount: m.amount,
                releaseDate: m.releaseDate.toISOString(),
                released: m.released,
                claimed: m.claimed || false,
                submittedAt: m.submissions[0]?.createdAt?.toISOString(),
                proofUrl: m.submissions[0]?.proofUrl,
                verificationStatus: m.verificationStatus?.toLowerCase() || m.submissions[0]?.status?.toLowerCase() || undefined,
            }))
        }));
        res.json({
            success: true,
            data: formattedDeals,
        });
    }
    catch (error) {
        console.error('Get KOL deals error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch deals'
        });
    }
});
// Get KOL stats
router.get('/stats', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const kolAddress = req.user.address.toLowerCase();
        // Get all escrows and calculate stats
        const escrows = await database_service_1.db.client.escrow.findMany({
            where: {
                kolAddress,
                chain: req.chain?.slug || 'base-sepolia',
            },
            include: { milestones: true },
        });
        // Calculate totals
        let totalEarnings = BigInt(0);
        let pendingEarnings = BigInt(0);
        let claimedEarnings = BigInt(0);
        let activeDeals = 0;
        let completedDeals = 0;
        for (const escrow of escrows) {
            const escrowTotal = BigInt(escrow.totalAmount);
            const escrowReleased = BigInt(escrow.releasedAmount || 0);
            const escrowClaimed = BigInt(escrow.claimedAmount || 0);
            totalEarnings += escrowTotal;
            pendingEarnings += escrowReleased - escrowClaimed;
            claimedEarnings += escrowClaimed;
            if (escrow.status === 'ACTIVE')
                activeDeals++;
            else if (escrow.status === 'COMPLETED')
                completedDeals++;
        }
        // Get average rating (mock for now)
        const averageRating = 4.8;
        // Use USDC as default
        const tokenSymbol = escrows[0]?.tokenSymbol || 'USDC';
        const tokenDecimals = escrows[0]?.tokenDecimals || 6;
        res.json({
            success: true,
            data: {
                totalEarnings: totalEarnings.toString(),
                pendingEarnings: pendingEarnings.toString(),
                claimedEarnings: claimedEarnings.toString(),
                activeDeals,
                completedDeals,
                averageRating,
                tokenSymbol,
                tokenDecimals,
            },
        });
    }
    catch (error) {
        console.error('Get KOL stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats'
        });
    }
});
// Get single deal details
router.get('/deals/:id', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const kolAddress = req.user.address.toLowerCase();
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Deal ID is required'
            });
            return;
        }
        // Get escrow from database
        const escrow = await database_service_1.db.client.escrow.findFirst({
            where: {
                chain: req.chain?.slug || 'base-sepolia',
                contractAddress: id.toLowerCase(),
                kolAddress,
            },
            include: {
                milestones: {
                    include: {
                        submissions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        }
                    },
                    orderBy: { milestoneIndex: 'asc' },
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        });
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Deal not found'
            });
            return;
        }
        // Format the response
        const formattedDeal = {
            id: escrow.id,
            address: escrow.contractAddress,
            projectName: escrow.projectName,
            projectAddress: escrow.projectAddress,
            totalAmount: escrow.totalAmount,
            releasedAmount: escrow.releasedAmount || '0',
            claimedAmount: escrow.claimedAmount || '0',
            tokenAddress: escrow.tokenAddress,
            tokenSymbol: escrow.tokenSymbol,
            tokenDecimals: escrow.tokenDecimals,
            status: escrow.status.toLowerCase(),
            createdAt: escrow.createdAt.toISOString(),
            description: escrow.dealDescription || '',
            requirements: escrow.requirements || [],
            milestones: escrow.milestones.map(m => ({
                id: m.milestoneIndex,
                title: m.title,
                description: m.description,
                amount: m.amount,
                releaseDate: m.releaseDate.toISOString(),
                released: m.released,
                claimed: m.claimed || false,
                submission: m.submissions[0] ? {
                    submittedAt: m.submissions[0].createdAt.toISOString(),
                    description: m.submissions[0].description,
                    proofUrl: m.submissions[0].proofUrl,
                    status: m.submissions[0].status.toLowerCase(),
                    feedback: m.submissions[0].feedback,
                } : undefined,
            })),
            activities: escrow.activities.map(a => ({
                id: a.id,
                action: a.action,
                userAddress: a.userAddress,
                createdAt: a.createdAt.toISOString(),
                details: a.details,
            })),
        };
        res.json({
            success: true,
            data: formattedDeal,
        });
    }
    catch (error) {
        console.error('Get KOL deal details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch deal details'
        });
    }
});
// Submit milestone deliverable
router.post('/deals/:id/milestones/:milestoneId/submit', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id, milestoneId } = req.params;
        const { description, proofType, proofUrl, socialPlatform, metrics } = req.body;
        const kolAddress = req.user.address.toLowerCase();
        if (!id || !milestoneId) {
            res.status(400).json({
                success: false,
                error: 'Deal ID and milestone ID are required'
            });
            return;
        }
        // Validate inputs
        if (!description || !proofUrl) {
            res.status(400).json({
                success: false,
                error: 'Description and proof URL are required'
            });
            return;
        }
        // Get escrow and milestone
        const escrow = await database_service_1.db.client.escrow.findFirst({
            where: {
                chain: req.chain?.slug || 'base-sepolia',
                contractAddress: id.toLowerCase(),
                kolAddress,
            },
            include: {
                milestones: {
                    where: { milestoneIndex: parseInt(milestoneId) }
                }
            },
        });
        if (!escrow || escrow.milestones.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Milestone not found'
            });
            return;
        }
        const milestone = escrow.milestones[0];
        if (!milestone) {
            res.status(404).json({
                success: false,
                error: 'Milestone not found'
            });
            return;
        }
        // Check if milestone can be submitted
        if (milestone.released) {
            res.status(400).json({
                success: false,
                error: 'Milestone already released'
            });
            return;
        }
        // No date restrictions - KOLs can submit anytime
        // Check for existing submission
        const existingSubmission = await database_service_1.db.client.milestoneSubmission.findFirst({
            where: {
                milestoneId: milestone.id,
                status: { in: ['PENDING', 'APPROVED'] }
            }
        });
        if (existingSubmission) {
            res.status(400).json({
                success: false,
                error: 'Milestone already has a pending or approved submission'
            });
            return;
        }
        // Create submission
        const submission = await database_service_1.db.client.milestoneSubmission.create({
            data: {
                milestoneId: milestone.id,
                kolAddress,
                description,
                proofType: proofType.toUpperCase(),
                proofUrl,
                socialPlatform,
                metrics,
                status: 'PENDING',
            }
        });
        // Update milestone verification status
        await database_service_1.db.client.milestone.update({
            where: { id: milestone.id },
            data: {
                verificationStatus: 'PENDING',
                updatedAt: new Date(),
            }
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: escrow.id,
            userAddress: kolAddress,
            action: 'DELIVERABLE_SUBMITTED',
            details: {
                milestoneId: milestone.milestoneIndex,
                milestoneTitle: milestone.title,
                submissionId: submission.id,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        // Emit websocket event
        (0, websocket_service_1.emitWebSocketEvent)('milestone:submitted', {
            escrowAddress: escrow.contractAddress,
            milestoneId: milestone.milestoneIndex,
            kolAddress,
            submissionId: submission.id,
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.json({
            success: true,
            message: 'Deliverable submitted successfully',
            submissionId: submission.id,
        });
    }
    catch (error) {
        console.error('Submit deliverable error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit deliverable'
        });
    }
});
// Claim released funds
router.post('/deals/:id/claim', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const kolAddress = req.user.address;
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Deal ID is required'
            });
            return;
        }
        // Get escrow from database
        const escrow = await database_service_1.db.client.escrow.findFirst({
            where: {
                chain: req.chain?.slug || 'base-sepolia',
                contractAddress: id.toLowerCase(),
                kolAddress: kolAddress.toLowerCase(),
            }
        });
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Calculate claimable amount
        const releasedAmount = BigInt(escrow.releasedAmount || 0);
        const claimedAmount = BigInt(escrow.claimedAmount || 0);
        const claimableAmount = releasedAmount - claimedAmount;
        if (claimableAmount <= BigInt(0)) {
            res.status(400).json({
                success: false,
                error: 'No funds available to claim'
            });
            return;
        }
        // Note: The actual claim transaction is executed from the frontend
        // This endpoint just validates and logs the intent
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: escrow.id,
            userAddress: kolAddress,
            action: 'CLAIM_INITIATED',
            details: {
                claimableAmount: claimableAmount.toString(),
                tokenSymbol: escrow.tokenSymbol,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.json({
            success: true,
            message: 'Please execute claim transaction from your wallet',
            escrowAddress: id,
            claimableAmount: claimableAmount.toString(),
        });
    }
    catch (error) {
        console.error('Claim funds error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process claim'
        });
    }
});
exports.default = router;
//# sourceMappingURL=kol.routes.js.map