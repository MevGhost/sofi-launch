// NOTIFICATIONS DISABLED - This entire file is commented out
/*
import { db } from './database.service';
import { WebSocketService } from './websocket.service';
import { NotificationType } from '../generated/prisma';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  async createNotification(notification: NotificationData) {
    try {
      // Create notification in database
      const created = await db.client.notification.create({
        data: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
        },
      });

      // Send real-time notification via WebSocket
      this.wsService.sendToUser(notification.userId, {
        type: 'notification',
        data: created,
      });

      return created;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      const updated = await db.client.notification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return updated;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const updated = await db.client.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return updated;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async getNotifications(userId: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) {
    try {
      const { limit = 20, offset = 0, unreadOnly = false } = options || {};

      const where: any = { userId };
      if (unreadOnly) {
        where.read = false;
      }

      const [notifications, total] = await Promise.all([
        db.client.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.client.notification.count({ where }),
      ]);

      return {
        notifications,
        total,
        unreadCount: unreadOnly ? total : await this.getUnreadCount(userId),
      };
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    try {
      return await db.client.notification.count({
        where: {
          userId,
          read: false,
        },
      });
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  async deleteNotification(notificationId: string, userId: string) {
    try {
      await db.client.notification.delete({
        where: {
          id: notificationId,
          userId,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }

  // Notification helpers for common events
  async notifyEscrowCreated(escrowId: string, _projectAddress: string, kolAddress: string) {
    const escrow = await db.client.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) return;

    // Notify KOL
    const kolUser = await db.client.user.findUnique({
      where: { address: kolAddress.toLowerCase() },
    });

    if (kolUser) {
      await this.createNotification({
        userId: kolUser.id,
        type: NotificationType.ESCROW_CREATED,
        title: 'New Escrow Created',
        message: `You have a new escrow deal for ${escrow.projectName}`,
        data: { escrowId, amount: escrow.totalAmount, tokenSymbol: escrow.tokenSymbol },
      });
    }
  }

  async notifyMilestoneSubmitted(milestoneId: string, escrowId: string) {
    const milestone = await db.client.milestone.findUnique({
      where: { id: milestoneId },
      include: { escrow: true },
    });

    if (!milestone) return;

    // Notify project owner
    const projectUser = await db.client.user.findUnique({
      where: { address: milestone.escrow.projectAddress.toLowerCase() },
    });

    if (projectUser) {
      await this.createNotification({
        userId: projectUser.id,
        type: NotificationType.MILESTONE_SUBMITTED,
        title: 'Milestone Submitted',
        message: `Milestone "${milestone.title}" has been submitted for review`,
        data: { milestoneId, escrowId, milestoneIndex: milestone.milestoneIndex },
      });
    }

    // Notify verifiers
    const verifiers = await db.client.verifier.findMany({
      where: { escrowId, isActive: true },
    });

    for (const verifier of verifiers) {
      const verifierUser = await db.client.user.findUnique({
        where: { address: verifier.address.toLowerCase() },
      });

      if (verifierUser) {
        await this.createNotification({
          userId: verifierUser.id,
          type: NotificationType.VERIFICATION_REQUIRED,
          title: 'Verification Required',
          message: `Please verify milestone "${milestone.title}"`,
          data: { milestoneId, escrowId },
        });
      }
    }
  }

  async notifyMilestoneApproved(milestoneId: string, escrowId: string) {
    const milestone = await db.client.milestone.findUnique({
      where: { id: milestoneId },
      include: { escrow: true },
    });

    if (!milestone) return;

    // Notify KOL
    const kolUser = await db.client.user.findUnique({
      where: { address: milestone.escrow.kolAddress.toLowerCase() },
    });

    if (kolUser) {
      await this.createNotification({
        userId: kolUser.id,
        type: NotificationType.MILESTONE_APPROVED,
        title: 'Milestone Approved',
        message: `Milestone "${milestone.title}" has been approved`,
        data: { milestoneId, escrowId, amount: milestone.amount },
      });
    }
  }

  async notifyMilestoneReleased(milestoneId: string, escrowId: string) {
    const milestone = await db.client.milestone.findUnique({
      where: { id: milestoneId },
      include: { escrow: true },
    });

    if (!milestone) return;

    // Notify KOL
    const kolUser = await db.client.user.findUnique({
      where: { address: milestone.escrow.kolAddress.toLowerCase() },
    });

    if (kolUser) {
      await this.createNotification({
        userId: kolUser.id,
        type: NotificationType.MILESTONE_RELEASED,
        title: 'Payment Released',
        message: `Payment for milestone "${milestone.title}" has been released`,
        data: { 
          milestoneId, 
          escrowId, 
          amount: milestone.amount,
          tokenSymbol: milestone.escrow.tokenSymbol 
        },
      });
    }
  }

  async notifyFundsClaimed(escrowId: string, amount: string) {
    const escrow = await db.client.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) return;

    // Notify project owner
    const projectUser = await db.client.user.findUnique({
      where: { address: escrow.projectAddress.toLowerCase() },
    });

    if (projectUser) {
      await this.createNotification({
        userId: projectUser.id,
        type: NotificationType.FUNDS_CLAIMED,
        title: 'Funds Claimed',
        message: `${amount} ${escrow.tokenSymbol} has been claimed by the KOL`,
        data: { escrowId, amount, tokenSymbol: escrow.tokenSymbol },
      });
    }
  }

  async notifyDisputeRaised(escrowId: string, reason: string, raisedBy: string) {
    const escrow = await db.client.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) return;

    // Notify both parties
    const addresses = [escrow.projectAddress, escrow.kolAddress];
    
    for (const address of addresses) {
      const user = await db.client.user.findUnique({
        where: { address: address.toLowerCase() },
      });

      if (user && user.address.toLowerCase() !== raisedBy.toLowerCase()) {
        await this.createNotification({
          userId: user.id,
          type: NotificationType.DISPUTE_RAISED,
          title: 'Dispute Raised',
          message: `A dispute has been raised: ${reason}`,
          data: { escrowId, reason },
        });
      }
    }
  }

  async notifyEscrowCompleted(escrowId: string) {
    const escrow = await db.client.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) return;

    // Notify both parties
    const addresses = [
      { address: escrow.projectAddress, role: 'project' },
      { address: escrow.kolAddress, role: 'kol' }
    ];
    
    for (const { address, role } of addresses) {
      const user = await db.client.user.findUnique({
        where: { address: address.toLowerCase() },
      });

      if (user) {
        await this.createNotification({
          userId: user.id,
          type: NotificationType.ESCROW_COMPLETED,
          title: 'Escrow Completed',
          message: role === 'project' 
            ? `Your escrow deal "${escrow.projectName}" has been completed successfully`
            : `The escrow deal for "${escrow.projectName}" has been completed`,
          data: { escrowId, totalAmount: escrow.totalAmount },
        });
      }
    }
  }

  async sendSystemAnnouncement(title: string, message: string, targetRole?: string) {
    try {
      const where: any = {};
      if (targetRole) {
        where.role = targetRole;
      }

      const users = await db.client.user.findMany({
        where,
        select: { id: true },
      });

      const notifications = await Promise.all(
        users.map(user => 
          this.createNotification({
            userId: user.id,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title,
            message,
            data: { targetRole },
          })
        )
      );

      return notifications.length;
    } catch (error) {
      console.error('Failed to send system announcement:', error);
      return 0;
    }
  }
}

// Singleton instance
let notificationService: NotificationService | null = null;

export function getNotificationService(wsService: WebSocketService): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService(wsService);
  }
  return notificationService;
}
*/