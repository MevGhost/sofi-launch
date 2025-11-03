import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { ChainRequest } from '../middleware/chain.middleware';
import { db } from '../services/database.service';
import { emitWebSocketEvent } from '../services/websocket.service';
import { contractService } from '../services/contract.service';

const router = Router();

// Middleware to check if user is a verifier
const requireVerifier = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userAddress = req.user!.address.toLowerCase();
    
    // Check if user is a verifier or admin
    const user = await db.client.user.findUnique({
      where: { address: userAddress },
    });
    
    if (!user || (user.role !== 'verifier' && user.role !== 'admin')) {
      res.status(403).json({ 
        success: false, 
        error: 'Access denied. Verifier role required.' 
      });
      return;
    }
    
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify permissions' 
    });
  }
};

// Get verifier stats
router.get('/stats', authenticate, requireVerifier, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const verifierAddress = req.user!.address.toLowerCase();
    
    // Get all submissions assigned to this verifier
    const submissions = await db.client.milestoneSubmission.findMany({
      where: {
        reviewedBy: verifierAddress,
      },
    });
    
    // Get pending submissions for this verifier
    const pendingSubmissions = await db.client.milestoneSubmission.findMany({
      where: {
        status: 'PENDING',
        milestone: {
          escrow: {
            verifiers: {
              some: {
                address: verifierAddress,
                isActive: true,
              }
            }
          }
        }
      },
    });
    
    // Calculate stats
    const totalReviews = submissions.length;
    const pendingReviews = pendingSubmissions.length;
    const approvedReviews = submissions.filter(s => s.status === 'APPROVED').length;
    const rejectedReviews = submissions.filter(s => s.status === 'REJECTED').length;
    
    // Calculate average review time
    const reviewedSubmissions = submissions.filter(s => s.reviewedAt);
    let averageReviewTime = '0 hours';
    
    if (reviewedSubmissions.length > 0) {
      const totalTime = reviewedSubmissions.reduce((sum, s) => {
        const submitTime = new Date(s.createdAt).getTime();
        const reviewTime = new Date(s.reviewedAt!).getTime();
        return sum + (reviewTime - submitTime);
      }, 0);
      
      const avgTimeMs = totalTime / reviewedSubmissions.length;
      const avgTimeHours = Math.round(avgTimeMs / (1000 * 60 * 60));
      averageReviewTime = `${avgTimeHours} hours`;
    }
    
    res.json({
      success: true,
      data: {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        averageReviewTime,
      },
    });
  } catch (error) {
    console.error('Get verifier stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats' 
    });
  }
});

// Get submissions for review
router.get('/submissions', authenticate, requireVerifier, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const verifierAddress = req.user!.address.toLowerCase();
    const { status = 'all' } = req.query;
    
    // Build where clause
    const whereClause: any = {
      milestone: {
        escrow: {
          verifiers: {
            some: {
              address: verifierAddress,
              isActive: true,
            }
          }
        }
      }
    };
    
    if (status !== 'all') {
      whereClause.status = status.toString().toUpperCase();
    }
    
    // Get submissions
    const submissions = await db.client.milestoneSubmission.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
    
    // Format response
    const formattedSubmissions = submissions.map(s => ({
      id: s.id,
      submissionId: s.id,
      escrowId: s.milestone.escrow.id,
      escrowAddress: s.milestone.escrow.contractAddress,
      projectName: s.milestone.escrow.projectName,
      projectAddress: s.milestone.escrow.projectAddress,
      kolAddress: s.milestone.escrow.kolAddress,
      kolName: s.milestone.escrow.kolUser?.name,
      milestoneIndex: s.milestone.milestoneIndex,
      milestoneTitle: s.milestone.title,
      description: s.description,
      proofUrl: s.proofUrl,
      proofType: s.proofType.toLowerCase(),
      socialPlatform: s.socialPlatform,
      metrics: s.metrics,
      submittedAt: s.createdAt.toISOString(),
      amount: s.milestone.amount,
      tokenSymbol: s.milestone.escrow.tokenSymbol,
      tokenDecimals: s.milestone.escrow.tokenDecimals,
      status: s.status.toLowerCase(),
      feedback: s.feedback,
      reviewedBy: s.reviewedBy,
      reviewedAt: s.reviewedAt?.toISOString(),
    }));
    
    res.json({
      success: true,
      data: formattedSubmissions,
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch submissions' 
    });
  }
});

// Get single submission details
router.get('/submissions/:id', authenticate, requireVerifier, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const verifierAddress = req.user!.address.toLowerCase();
    
    // Get submission with full details
    const submission = await db.client.milestoneSubmission.findFirst({
      where: {
        id,
        milestone: {
          escrow: {
            verifiers: {
              some: {
                address: verifierAddress,
                isActive: true,
              }
            }
          }
        }
      },
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
  } catch (error) {
    console.error('Get submission details error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch submission details' 
    });
  }
});

// Review submission
router.post('/submissions/:id/review', authenticate, requireVerifier, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, feedback } = req.body;
    const verifierAddress = req.user!.address.toLowerCase();
    
    // Validate input
    if (!decision || !['approve', 'reject'].includes(decision)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid decision. Must be "approve" or "reject"' 
      });
      return;
    }
    
    if (!feedback || feedback.trim().length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Feedback is required' 
      });
      return;
    }
    
    // Get submission
    const submission = await db.client.milestoneSubmission.findFirst({
      where: {
        id,
        status: 'PENDING',
        milestone: {
          escrow: {
            verifiers: {
              some: {
                address: verifierAddress,
                isActive: true,
              }
            }
          }
        }
      },
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
        error: 'Pending submission not found' 
      });
      return;
    }
    
    // Update submission
    await db.client.milestoneSubmission.update({
      where: { id },
      data: {
        status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        feedback: feedback.trim(),
        reviewedBy: verifierAddress,
        reviewedAt: new Date(),
      }
    });
    
    // Update milestone verification status
    await db.client.milestone.update({
      where: { id: submission.milestoneId },
      data: {
        verificationStatus: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        verified: decision === 'approve',
        verifiedAt: decision === 'approve' ? new Date() : null,
      }
    });
    
    // If approved, update the milestone as verified so it can be released
    if (decision === 'approve') {
      // Note: The actual release will be done by the project owner via smart contract
      // We just mark it as verified in the database
    }
    
    // Log activity
    await db.logActivity({
      escrowId: submission.milestone.escrow.id,
      userAddress: verifierAddress,
      action: `MILESTONE_${decision.toUpperCase()}`,
      details: {
        milestoneId: submission.milestone.milestoneIndex,
        submissionId: submission.id,
        feedback,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    // Emit websocket event
    emitWebSocketEvent('milestone:reviewed', {
      escrowAddress: submission.milestone.escrow.contractAddress,
      milestoneId: submission.milestone.milestoneIndex,
      submissionId: submission.id,
      decision,
      verifierAddress,
      chain: (req as ChainRequest).chain?.slug || 'base-sepolia',
    });
    
    // If approved, automatically release the milestone funds
    let releaseSuccess = false;
    let releaseTxHash: string | undefined;
    
    if (decision === 'approve' && !submission.milestone.released) {
      try {
        console.log(`Automatically releasing milestone ${submission.milestone.milestoneIndex} for escrow ${submission.milestone.escrow.contractAddress}`);
        
        const releaseResult = await contractService.releaseAndTransferPayment(
          submission.milestone.escrow.contractAddress,
          submission.milestone.milestoneIndex,
          verifierAddress
        );
        
        if (releaseResult.success && releaseResult.transactionHash) {
          releaseSuccess = true;
          releaseTxHash = releaseResult.transactionHash;
          
          // Update milestone as released AND claimed in database
          await db.client.milestone.update({
            where: { id: submission.milestoneId },
            data: {
              released: true,
              releasedAt: new Date(),
              claimed: true,  // Mark as claimed since funds are auto-transferred
            }
          });
          
          // Update escrow released AND claimed amounts
          const escrow = submission.milestone.escrow;
          const milestoneAmount = BigInt(submission.milestone.amount);
          const newReleasedAmount = BigInt(escrow.releasedAmount || 0) + milestoneAmount;
          const newClaimedAmount = BigInt(escrow.claimedAmount || 0) + milestoneAmount;
          
          await db.client.escrow.update({
            where: { id: escrow.id },
            data: {
              releasedAmount: newReleasedAmount.toString(),
              claimedAmount: newClaimedAmount.toString(),  // Update claimed amount too
            }
          });
          
          // Log the release and transfer activity
          await db.logActivity({
            escrowId: escrow.id,
            userAddress: verifierAddress,
            action: 'MILESTONE_AUTO_TRANSFERRED',
            details: { 
              milestoneIndex: submission.milestone.milestoneIndex,
              amount: submission.milestone.amount,
              transactionHash: releaseTxHash,
              kolAddress: submission.milestone.escrow.kolAddress,
              note: 'Funds automatically transferred to KOL upon approval',
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
          
          console.log(`Successfully released milestone. TX: ${releaseTxHash}`);
        } else {
          console.error(`Failed to release milestone: ${releaseResult.error}`);
        }
      } catch (error) {
        console.error('Error during automatic release:', error);
      }
    }
    
    res.json({
      success: true,
      message: decision === 'approve' && releaseSuccess 
        ? `Milestone approved and funds transferred to KOL successfully` 
        : `Milestone ${decision === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        released: releaseSuccess,
        transactionHash: releaseTxHash,
      }
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit review' 
    });
  }
});

export default router;