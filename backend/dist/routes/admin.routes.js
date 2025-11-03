"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const websocket_service_1 = require("../services/websocket.service");
const database_service_1 = require("../services/database.service");
const contract_service_1 = require("../services/contract.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Get single escrow details (admin view)
router.get('/escrows/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Escrow ID is required'
            });
            return;
        }
        // Get escrow from database with all relations
        // First check if it's a database ID (CUID)
        const isCuid = /^[a-z0-9]{25}$/i.test(id);
        let escrow;
        if (isCuid) {
            escrow = await database_service_1.db.getEscrowById(id);
        }
        else {
            escrow = await database_service_1.db.getEscrowByAddress(id, req.chain?.slug || 'base-sepolia');
        }
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Format for frontend
        const formattedEscrow = {
            id: escrow.id,
            address: escrow.contractAddress,
            projectName: escrow.projectName,
            projectAddress: escrow.projectAddress,
            kolAddress: escrow.kolAddress,
            totalAmount: escrow.totalAmount,
            releasedAmount: escrow.releasedAmount || '0',
            tokenAddress: escrow.tokenAddress,
            tokenSymbol: escrow.tokenSymbol,
            tokenDecimals: escrow.tokenDecimals,
            status: escrow.status.toLowerCase(),
            createdAt: escrow.createdAt.toISOString(),
            milestones: escrow.milestones.map((m) => ({
                id: m.milestoneIndex,
                amount: m.amount,
                releaseDate: m.releaseDate.toISOString(),
                released: m.released,
                verified: m.verified,
            })),
            verifiers: escrow.verifiers.map((v) => ({
                address: v.address,
                addedAt: v.addedAt.toISOString(),
            })),
            disputes: escrow.disputes.map((d) => ({
                id: d.id,
                reason: d.reason,
                raisedBy: d.raisedBy,
                createdAt: d.createdAt.toISOString(),
                status: d.status,
            })),
            activities: escrow.activities?.map((a) => ({
                id: a.id,
                action: a.action,
                userAddress: a.userAddress,
                createdAt: a.createdAt.toISOString(),
                details: a.details,
            })) || [],
        };
        res.json({
            success: true,
            data: formattedEscrow,
        });
    }
    catch (error) {
        console.error('Admin get escrow details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escrow details'
        });
    }
});
// Get all escrows (admin view)
router.get('/escrows', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        // Get all escrows from database - admin sees all chains
        const escrows = await database_service_1.db.getAllEscrows({
            status: status,
            limit: Number(limit),
            offset: Number(offset),
        });
        // Format for frontend with proper milestone data
        const formattedEscrows = escrows.map(escrow => ({
            id: escrow.id,
            address: escrow.contractAddress,
            projectName: escrow.projectName,
            projectAddress: escrow.projectAddress,
            kolAddress: escrow.kolAddress,
            totalAmount: escrow.totalAmount,
            tokenSymbol: escrow.tokenSymbol,
            tokenDecimals: escrow.tokenDecimals,
            status: escrow.status.toLowerCase(),
            createdAt: escrow.createdAt.toISOString(),
            verificationRequested: escrow.requireVerification,
            disputes: [],
            milestones: escrow.milestones.map((m) => ({
                id: m.id,
                title: m.title,
                amount: m.amount,
                releaseDate: m.releaseDate.toISOString(),
                released: m.released,
                verified: m.verified,
            })),
            progress: escrow.milestones.length > 0
                ? (escrow.milestones.filter((m) => m.released).length / escrow.milestones.length) * 100
                : 0,
        }));
        res.json({
            success: true,
            data: formattedEscrows,
        });
    }
    catch (error) {
        console.error('Admin get escrows error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escrows'
        });
    }
});
// Approve escrow
router.post('/escrows/:id/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        // Update escrow status in database
        await database_service_1.db.client.escrow.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                updatedAt: new Date()
            }
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: id,
            userAddress: req.user.address,
            action: 'ESCROW_APPROVED',
            details: { approvedBy: req.user.address },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        // Emit websocket event
        (0, websocket_service_1.emitWebSocketEvent)('escrow:approved', {
            escrowId: id,
            approvedBy: req.user.address,
            timestamp: new Date(),
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.json({
            success: true,
            message: 'Escrow approved successfully',
        });
    }
    catch (error) {
        console.error('Admin approve escrow error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve escrow'
        });
    }
});
// Cancel escrow and return funds to project owner
router.post('/escrows/:id/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminAddress = req.user.address;
        // Get escrow details
        const escrow = await database_service_1.db.client.escrow.findUnique({
            where: { id },
            include: { milestones: true }
        });
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Check if there are unreleased funds
        const hasUnreleasedFunds = escrow.milestones.some(m => !m.released);
        let clawbackResult = null;
        if (hasUnreleasedFunds) {
            // Trigger clawback to return unreleased funds to project owner
            console.log(`Initiating clawback for escrow ${escrow.contractAddress}`);
            clawbackResult = await contract_service_1.contractService.clawbackFunds(escrow.contractAddress, null);
            if (!clawbackResult.success) {
                throw new Error(clawbackResult.error || 'Failed to return funds');
            }
            console.log(`Clawback successful. TX: ${clawbackResult.transactionHash}`);
        }
        // Update escrow status in database
        await database_service_1.db.client.escrow.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                updatedAt: new Date()
            }
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: id,
            userAddress: adminAddress,
            action: 'ESCROW_CANCELLED',
            details: {
                cancelledBy: adminAddress,
                reason,
                fundsReturned: hasUnreleasedFunds,
                transactionHash: hasUnreleasedFunds ? clawbackResult?.transactionHash : null
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        (0, websocket_service_1.emitWebSocketEvent)('escrow:cancelled', {
            escrowId: id,
            cancelledBy: adminAddress,
            reason,
            fundsReturned: hasUnreleasedFunds,
            timestamp: new Date(),
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.json({
            success: true,
            message: hasUnreleasedFunds
                ? 'Escrow cancelled and funds returned to project owner'
                : 'Escrow cancelled successfully',
            data: {
                transactionHash: hasUnreleasedFunds ? clawbackResult?.transactionHash : null
            }
        });
    }
    catch (error) {
        console.error('Admin cancel escrow error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel escrow'
        });
    }
});
// Resolve dispute
router.post('/escrows/:id/dispute', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, notes } = req.body;
        // Get escrow to find active dispute
        const escrow = await database_service_1.db.client.escrow.findUnique({
            where: { id },
            include: { disputes: { where: { status: 'OPEN' } } }
        });
        if (!escrow) {
            res.status(404).json({ success: false, error: 'Escrow not found' });
            return;
        }
        const activeDispute = escrow.disputes[0];
        if (!activeDispute) {
            res.status(400).json({ success: false, error: 'No active dispute found' });
            return;
        }
        // Resolve dispute
        await database_service_1.db.client.dispute.update({
            where: { id: activeDispute.id },
            data: {
                status: 'RESOLVED',
                resolution: notes ? `${resolution === 'release' ? 'RESOLVED_FOR_KOL' : 'RESOLVED_FOR_PROJECT'}: ${notes}` : (resolution === 'release' ? 'RESOLVED_FOR_KOL' : 'RESOLVED_FOR_PROJECT'),
                resolvedAt: new Date(),
                resolvedBy: req.user.address
            }
        });
        // Update escrow status
        await database_service_1.db.client.escrow.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                updatedAt: new Date()
            }
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: id,
            userAddress: req.user.address,
            action: 'DISPUTE_RESOLVED',
            details: { resolution, notes, disputeId: activeDispute.id },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        (0, websocket_service_1.emitWebSocketEvent)('dispute:resolved', {
            escrowId: id,
            resolution,
            resolvedBy: req.user.address,
            notes,
            timestamp: new Date(),
            chain: req.chain?.slug || 'base-sepolia',
        });
        res.json({
            success: true,
            message: `Dispute resolved successfully. Funds will be ${resolution === 'release' ? 'released to KOL' : 'refunded to project'}.`,
        });
    }
    catch (error) {
        console.error('Admin resolve dispute error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resolve dispute'
        });
    }
});
// Get admin statistics
router.get('/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const adminAddress = req.user.address.toLowerCase();
        const chain = req.chain?.slug || 'base-sepolia';
        const [activeEscrows, escrowsForVolume, activeUsers, pendingSubmissions] = await Promise.all([
            database_service_1.db.client.escrow.count({ where: { status: { in: ['ACTIVE', 'PAUSED'] }, chain } }),
            database_service_1.db.client.escrow.findMany({ where: { chain }, select: { totalAmount: true } }),
            database_service_1.db.client.user.count({ where: { lastActive: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
            database_service_1.db.client.milestoneSubmission.count({ where: { status: 'PENDING' } })
        ]);
        // Calculate total volume manually since totalAmount is a string
        const totalVolume = escrowsForVolume.reduce((sum, escrow) => {
            return sum + BigInt(escrow.totalAmount || '0');
        }, BigInt(0));
        const [completedEscrows, totalEscrows, activeDisputes] = await Promise.all([
            database_service_1.db.client.escrow.count({ where: { status: 'COMPLETED', chain } }),
            database_service_1.db.client.escrow.count({ where: { chain } }),
            database_service_1.db.client.dispute.count({ where: { status: 'OPEN' } })
        ]);
        // Get review stats for the admin acting as verifier
        const reviewedSubmissions = await database_service_1.db.client.milestoneSubmission.findMany({
            where: { reviewedBy: adminAddress },
        });
        const totalReviews = reviewedSubmissions.length;
        const approvedReviews = reviewedSubmissions.filter(s => s.status === 'APPROVED').length;
        const rejectedReviews = reviewedSubmissions.filter(s => s.status === 'REJECTED').length;
        const stats = {
            totalEscrows,
            pendingVerification: pendingSubmissions,
            pendingVerifications: pendingSubmissions,
            activeDisputes,
            totalValueLocked: totalVolume.toString(),
            completedEscrows,
            activeEscrows,
            totalVolume: totalVolume.toString(),
            activeUsers,
            // Verifier stats
            totalReviews,
            pendingReviews: pendingSubmissions,
            approvedReviews,
            rejectedReviews,
            // Additional useful stats
            averageEscrowValue: totalEscrows > 0
                ? (Number(totalVolume) / totalEscrows).toFixed(2)
                : '0',
            completionRate: totalEscrows > 0
                ? ((completedEscrows / totalEscrows) * 100).toFixed(1)
                : '0',
        };
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});
// Get KOL data
router.get('/kols', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const kols = await database_service_1.db.client.user.findMany({
            where: { role: 'kol' },
            include: {
                _count: {
                    select: {
                        escrowsAsKol: true
                    }
                }
            }
        });
        // Calculate earnings for each KOL
        const kolsWithEarnings = await Promise.all(kols.map(async (kol) => {
            const escrows = await database_service_1.db.client.escrow.findMany({
                where: {
                    kolAddress: kol.address,
                    status: 'COMPLETED',
                    chain: req.chain?.slug || 'base-sepolia'
                },
                select: { totalAmount: true }
            });
            const totalEarnings = escrows.reduce((sum, escrow) => {
                return sum + BigInt(escrow.totalAmount || '0');
            }, BigInt(0));
            return {
                ...kol,
                totalEarnings: totalEarnings.toString(),
                escrowCount: kol._count.escrowsAsKol
            };
        }));
        res.json({
            success: true,
            data: kolsWithEarnings
        });
    }
    catch (error) {
        console.error('Error fetching KOLs:', error);
        res.status(500).json({ error: 'Failed to fetch KOLs' });
    }
});
// Get verifier data
router.get('/verifiers', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (_req, res) => {
    try {
        const verifiers = await database_service_1.db.client.user.findMany({
            where: { role: 'verifier' },
            include: {
                verifications: {
                    include: {
                        escrow: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                _count: {
                    select: {
                        verifications: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: verifiers
        });
    }
    catch (error) {
        console.error('Error fetching verifiers:', error);
        res.status(500).json({ error: 'Failed to fetch verifiers' });
    }
});
// Get team members
router.get('/team', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (_req, res) => {
    try {
        const teamMembers = await database_service_1.db.client.user.findMany({
            where: { role: 'team' },
            include: {
                _count: {
                    select: {
                        escrowsAsProject: true,
                        activities: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: teamMembers
        });
    }
    catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});
// Get milestone submissions (with optional filtering)
router.get('/submissions', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { status = 'all' } = req.query;
        // Build where clause
        const whereClause = {};
        if (status !== 'all') {
            whereClause.status = status.toString().toUpperCase();
        }
        const submissions = await database_service_1.db.client.milestoneSubmission.findMany({
            where: whereClause,
            include: {
                milestone: {
                    include: {
                        escrow: {
                            include: {
                                kolUser: true,
                                projectUser: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Format the response
        const formattedSubmissions = submissions.map(sub => ({
            id: sub.id,
            submissionId: sub.id,
            milestoneId: sub.milestoneId,
            milestoneIndex: sub.milestone.milestoneIndex,
            milestoneTitle: sub.milestone.title,
            escrowId: sub.milestone.escrow.id,
            escrowAddress: sub.milestone.escrow.contractAddress,
            projectName: sub.milestone.escrow.projectName,
            projectAddress: sub.milestone.escrow.projectAddress,
            kolAddress: sub.kolAddress,
            kolName: sub.milestone.escrow.kolUser?.name,
            description: sub.description,
            proofType: sub.proofType.toLowerCase(),
            proofUrl: sub.proofUrl,
            socialPlatform: sub.socialPlatform,
            metrics: sub.metrics,
            submittedAt: sub.createdAt.toISOString(),
            amount: sub.milestone.amount,
            tokenSymbol: sub.milestone.escrow.tokenSymbol,
            tokenDecimals: sub.milestone.escrow.tokenDecimals,
            status: sub.status.toLowerCase(),
            feedback: sub.feedback,
            reviewedBy: sub.reviewedBy,
            reviewedAt: sub.reviewedAt?.toISOString(),
        }));
        res.json({
            success: true,
            data: formattedSubmissions
        });
    }
    catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submissions'
        });
    }
});
// Get pending milestone submissions (legacy endpoint for backward compatibility)
router.get('/submissions/pending', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (_req, res) => {
    try {
        const submissions = await database_service_1.db.client.milestoneSubmission.findMany({
            where: { status: 'PENDING' },
            include: {
                milestone: {
                    include: {
                        escrow: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Format the response
        const formattedSubmissions = submissions.map(sub => ({
            id: sub.id,
            milestoneId: sub.milestoneId,
            milestoneIndex: sub.milestone.milestoneIndex,
            milestoneTitle: sub.milestone.title,
            escrowId: sub.milestone.escrow.id,
            escrowAddress: sub.milestone.escrow.contractAddress,
            projectName: sub.milestone.escrow.projectName,
            kolAddress: sub.kolAddress,
            description: sub.description,
            proofType: sub.proofType.toLowerCase(),
            proofUrl: sub.proofUrl,
            socialPlatform: sub.socialPlatform,
            metrics: sub.metrics,
            submittedAt: sub.createdAt.toISOString(),
            amount: sub.milestone.amount,
            tokenSymbol: sub.milestone.escrow.tokenSymbol,
            tokenDecimals: sub.milestone.escrow.tokenDecimals,
        }));
        res.json({
            success: true,
            data: formattedSubmissions
        });
    }
    catch (error) {
        console.error('Error fetching pending submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending submissions'
        });
    }
});
// Get all milestone submissions for an escrow
router.get('/escrows/:id/submissions', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'Escrow ID is required'
            });
            return;
        }
        const escrow = await database_service_1.db.client.escrow.findUnique({
            where: {
                chain_contractAddress: {
                    chain: req.chain?.slug || 'base-sepolia',
                    contractAddress: id.toLowerCase()
                }
            },
            include: {
                milestones: {
                    include: {
                        submissions: {
                            orderBy: { createdAt: 'desc' }
                        }
                    },
                    orderBy: { milestoneIndex: 'asc' }
                }
            }
        });
        if (!escrow) {
            res.status(404).json({
                success: false,
                error: 'Escrow not found'
            });
            return;
        }
        // Format submissions by milestone
        const submissionsByMilestone = escrow.milestones.map(milestone => ({
            milestoneId: milestone.id,
            milestoneIndex: milestone.milestoneIndex,
            milestoneTitle: milestone.title,
            amount: milestone.amount,
            released: milestone.released,
            submissions: milestone.submissions.map(sub => ({
                id: sub.id,
                kolAddress: sub.kolAddress,
                description: sub.description,
                proofType: sub.proofType.toLowerCase(),
                proofUrl: sub.proofUrl,
                socialPlatform: sub.socialPlatform,
                metrics: sub.metrics,
                status: sub.status.toLowerCase(),
                feedback: sub.feedback,
                reviewedBy: sub.reviewedBy,
                reviewedAt: sub.reviewedAt?.toISOString(),
                submittedAt: sub.createdAt.toISOString(),
            }))
        }));
        res.json({
            success: true,
            data: {
                escrowId: escrow.id,
                escrowAddress: escrow.contractAddress,
                projectName: escrow.projectName,
                milestones: submissionsByMilestone
            }
        });
    }
    catch (error) {
        console.error('Error fetching escrow submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submissions'
        });
    }
});
// Review (approve/reject) a milestone submission
router.post('/submissions/:id/review', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { action, feedback } = req.body;
        const adminAddress = req.user.address;
        if (!['approve', 'reject'].includes(action)) {
            res.status(400).json({
                success: false,
                error: 'Invalid action. Must be approve or reject'
            });
            return;
        }
        // Get submission with milestone and escrow
        const submission = await database_service_1.db.client.milestoneSubmission.findUnique({
            where: { id },
            include: {
                milestone: {
                    include: {
                        escrow: true
                    }
                }
            }
        });
        if (!submission) {
            res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
            return;
        }
        if (submission.status !== 'PENDING') {
            res.status(400).json({
                success: false,
                error: 'Submission has already been reviewed'
            });
            return;
        }
        // Update submission
        await database_service_1.db.client.milestoneSubmission.update({
            where: { id },
            data: {
                status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                feedback: feedback || null,
                reviewedBy: adminAddress,
                reviewedAt: new Date()
            }
        });
        // Update milestone verification status
        await database_service_1.db.client.milestone.update({
            where: { id: submission.milestoneId },
            data: {
                verificationStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
                verified: action === 'approve',
                verifiedAt: action === 'approve' ? new Date() : null,
            }
        });
        // Log activity
        await database_service_1.db.logActivity({
            escrowId: submission.milestone.escrow.id,
            userAddress: adminAddress,
            action: action === 'approve' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
            details: {
                submissionId: id,
                milestoneIndex: submission.milestone.milestoneIndex,
                feedback,
                kolAddress: submission.kolAddress
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            chain: req.chain?.slug || 'base-sepolia',
        });
        // Emit websocket event
        (0, websocket_service_1.emitWebSocketEvent)(`submission:${action}d`, {
            submissionId: id,
            escrowAddress: submission.milestone.escrow.contractAddress,
            milestoneId: submission.milestone.milestoneIndex,
            kolAddress: submission.kolAddress,
            adminAddress,
            feedback,
            chain: req.chain?.slug || 'base-sepolia',
        });
        // If approved, automatically release the milestone funds
        let releaseTxHash;
        if (action === 'approve' && !submission.milestone.released) {
            try {
                console.log(`Automatically releasing milestone ${submission.milestone.milestoneIndex} for escrow ${submission.milestone.escrow.contractAddress}`);
                const releaseResult = await contract_service_1.contractService.releaseAndTransferPayment(submission.milestone.escrow.contractAddress || '', submission.milestone.milestoneIndex, adminAddress);
                if (releaseResult.success && releaseResult.transactionHash) {
                    releaseTxHash = releaseResult.transactionHash;
                    // Update milestone as released in database (NOT claimed - KOL must claim manually)
                    await database_service_1.db.client.milestone.update({
                        where: { id: submission.milestoneId },
                        data: {
                            released: true,
                            releasedAt: new Date(),
                            claimed: false, // KOL must claim manually
                        }
                    });
                    // Update escrow released amount only (NOT claimed amount)
                    const escrow = submission.milestone.escrow;
                    const milestoneAmount = BigInt(submission.milestone.amount);
                    const newReleasedAmount = BigInt(escrow.releasedAmount || 0) + milestoneAmount;
                    await database_service_1.db.client.escrow.update({
                        where: { id: escrow.id },
                        data: {
                            releasedAmount: newReleasedAmount.toString(),
                            // Since we auto-transfer, also update claimedAmount
                            claimedAmount: newReleasedAmount.toString(),
                        }
                    });
                    // Check if all milestones are released and update escrow status
                    const allMilestones = await database_service_1.db.client.milestone.findMany({
                        where: { escrowId: escrow.id }
                    });
                    const allReleased = allMilestones.every(m => m.released);
                    if (allReleased) {
                        await database_service_1.db.updateEscrowStatus(escrow.contractAddress, 'COMPLETED');
                        // Log completion activity
                        await database_service_1.db.logActivity({
                            escrowId: escrow.id,
                            userAddress: adminAddress,
                            action: 'ESCROW_COMPLETED',
                            details: {
                                totalMilestones: allMilestones.length,
                                totalAmount: escrow.totalAmount,
                                completedBy: adminAddress
                            },
                            ipAddress: req.ip,
                            userAgent: req.get('user-agent'),
                            chain: req.chain?.slug || 'base-sepolia',
                        });
                        // Emit completion event
                        (0, websocket_service_1.emitWebSocketEvent)('escrow:completed', {
                            escrowId: escrow.id,
                            contractAddress: escrow.contractAddress,
                            projectAddress: escrow.projectAddress,
                            kolAddress: escrow.kolAddress,
                            timestamp: new Date(),
                            chain: req.chain?.slug || 'base-sepolia',
                        });
                    }
                    // Log the release activity
                    await database_service_1.db.logActivity({
                        escrowId: escrow.id,
                        userAddress: adminAddress,
                        action: 'MILESTONE_RELEASED',
                        details: {
                            milestoneIndex: submission.milestone.milestoneIndex,
                            amount: submission.milestone.amount,
                            transactionHash: releaseTxHash,
                            kolAddress: submission.kolAddress,
                            note: 'Milestone released. Funds available for KOL to claim.',
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent'),
                        chain: req.chain?.slug || 'base-sepolia',
                    });
                    console.log(`Successfully released milestone. TX: ${releaseTxHash}`);
                }
                else {
                    console.error(`Failed to release milestone: ${releaseResult.error}`);
                }
            }
            catch (error) {
                console.error('Error during automatic release:', error);
            }
        }
        res.json({
            success: true,
            message: action === 'approve'
                ? `Submission approved. The project owner (${submission.milestone.escrow.projectAddress}) must now release the milestone from their dashboard.`
                : `Submission ${action}d successfully`,
            data: {
                submissionId: id,
                escrowAddress: submission.milestone.escrow.contractAddress,
                milestoneIndex: submission.milestone.milestoneIndex,
                projectOwner: submission.milestone.escrow.projectAddress,
                released: false,
                needsProjectOwnerRelease: action === 'approve' && !submission.milestone.released,
                message: action === 'approve' ? 'Project owner must release the milestone from their dashboard' : null
            }
        });
    }
    catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to review submission'
        });
    }
});
// Settings endpoints
router.get('/settings', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const settings = await database_service_1.db.client.settings.findFirst({
            where: { userId: req.user.userId }
        });
        res.json({
            success: true,
            data: settings || {
                platformName: 'TokenFlow',
                platformFee: '2.5',
                minEscrowAmount: '100',
                maxEscrowAmount: '1000000',
                defaultCurrency: 'USDC',
                maintenanceMode: false,
                twoFactorRequired: false,
                sessionTimeout: '30',
                maxLoginAttempts: '5',
                ipWhitelist: '',
                requireVerification: true,
                emailNotifications: true,
                escrowCreated: true,
                escrowCompleted: true,
                disputeRaised: true,
                verificationRequired: true,
                dailyReport: false
            }
        });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
router.put('/settings', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const settings = await database_service_1.db.client.settings.upsert({
            where: { userId: req.user.userId },
            update: req.body,
            create: {
                userId: req.user.userId,
                ...req.body
            }
        });
        res.json({
            success: true,
            data: settings
        });
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// Get single submission details (verifier functionality)
router.get('/submissions/:id/details', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(types_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        // Get submission with full details
        const submission = await database_service_1.db.client.milestoneSubmission.findUnique({
            where: { id },
            include: {
                milestone: {
                    include: {
                        escrow: {
                            include: {
                                kolUser: true,
                                projectUser: true,
                            }
                        },
                        submissions: {
                            where: {
                                id: { not: id },
                                status: { not: 'PENDING' }
                            },
                            orderBy: { createdAt: 'desc' },
                        }
                    }
                }
            }
        });
        if (!submission) {
            res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
            return;
        }
        // Format response
        const formattedSubmission = {
            id: submission.id,
            submissionId: submission.id,
            escrowId: submission.milestone.escrow.id,
            escrowAddress: submission.milestone.escrow.contractAddress,
            projectName: submission.milestone.escrow.projectName,
            projectAddress: submission.milestone.escrow.projectAddress,
            kolAddress: submission.milestone.escrow.kolAddress,
            kolName: submission.milestone.escrow.kolUser?.name,
            milestoneIndex: submission.milestone.milestoneIndex,
            milestoneTitle: submission.milestone.title,
            milestoneDescription: submission.milestone.description,
            amount: submission.milestone.amount,
            tokenSymbol: submission.milestone.escrow.tokenSymbol,
            tokenDecimals: submission.milestone.escrow.tokenDecimals,
            releaseDate: submission.milestone.releaseDate.toISOString(),
            submission: {
                id: submission.id,
                description: submission.description,
                proofType: submission.proofType.toLowerCase(),
                proofUrl: submission.proofUrl,
                socialPlatform: submission.socialPlatform,
                metrics: submission.metrics,
                submittedAt: submission.createdAt.toISOString(),
                status: submission.status.toLowerCase(),
                feedback: submission.feedback,
                reviewedBy: submission.reviewedBy,
                reviewedAt: submission.reviewedAt?.toISOString(),
            },
            requirements: submission.milestone.escrow.requirements || [],
            previousSubmissions: submission.milestone.submissions.map(s => ({
                id: s.id,
                status: s.status.toLowerCase(),
                feedback: s.feedback,
                reviewedAt: s.reviewedAt?.toISOString(),
                reviewedBy: s.reviewedBy,
            })),
        };
        res.json({
            success: true,
            data: formattedSubmission,
        });
    }
    catch (error) {
        console.error('Get submission details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submission details'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map