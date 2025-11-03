// NOTIFICATIONS DISABLED - This entire file is commented out
/*
import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { db } from '../services/database.service';

const router = Router();

// Get user notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 50, unreadOnly = false, afterDate } = req.query;
    const userId = req.user!.userId;
    
    const notifications = await db.getUserNotifications(userId, {
      limit: Number(limit),
      unreadOnly: unreadOnly === 'true',
      afterDate: afterDate ? new Date(afterDate as string) : undefined,
    });
    
    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notifications' 
    });
  }
});

// Get unread notification count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const count = await db.getUnreadNotificationCount(userId);
    
    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch unread count' 
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    if (!id) {
      res.status(400).json({ 
        success: false, 
        error: 'Notification ID is required' 
      });
      return;
    }
    
    const notification = await db.markNotificationAsRead(id, userId);
    
    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark notification as read' 
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    const result = await db.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark all notifications as read' 
    });
  }
});

export default router;
*/

// Export empty router to prevent import errors
import { Router } from 'express';
const router = Router();
export default router;