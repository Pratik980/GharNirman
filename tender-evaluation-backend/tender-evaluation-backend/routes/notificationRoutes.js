import express from 'express';
import Notification from '../models/Notification.js';
import { sendNotificationToContractors, sendNotificationToHomeowners, sendNotificationToAdmins, sendNotificationToSpecificHomeowner, EVENTS } from '../config/pusher.js';
const router = express.Router();

// GET /api/notifications/:contractorId
router.get('/:contractorId', async (req, res) => {
  const { contractorId } = req.params;
  const notifications = await Notification.find({ contractorId }).sort({ createdAt: -1 });
  res.json(notifications);
});

// ✅ Get notifications for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType = 'homeowner' } = req.query;
    
    console.log(`🔍 Fetching notifications for ${userType} ${userId}`);
    
    const notifications = await Notification.find({
      userId: userId,
      userType: userType
    }).sort({ createdAt: -1 });
    
    console.log(`📢 Found ${notifications.length} notifications for ${userType} ${userId}`);
    
    res.json({
      success: true,
      count: notifications.length,
      notifications: notifications
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      detail: error.message
    });
  }
});

// ✅ Debug route to check all notifications
router.get('/debug/all', async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(20);
    console.log('🔍 All notifications in database:', notifications);
    res.json({
      message: "Debug: All notifications",
      count: notifications.length,
      notifications: notifications
    });
  } catch (error) {
    console.error("❌ Error fetching notifications for debug:", error);
    res.status(500).json({ error: "Failed to fetch notifications", detail: error.message });
  }
});

// ✅ Test route to manually send a notification to a homeowner
router.post('/test/send', async (req, res) => {
  try {
    const { homeownerId, message = 'Test notification' } = req.body;
    
    if (!homeownerId) {
      return res.status(400).json({ error: 'homeownerId is required' });
    }
    
    console.log(`🧪 Sending test notification to homeowner ${homeownerId}`);
    
    // Create notification in database
    const notification = await Notification.create({
      userId: homeownerId,
      userType: 'homeowner',
      type: 'test',
      message: message,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Test notification created in database:`, notification);
    
    // Try to send real-time notification via Pusher (but don't fail if it doesn't work)
    try {
      await sendNotificationToSpecificHomeowner(
        homeownerId,
        EVENTS.GENERAL_NOTIFICATION,
        {
          type: 'test',
          message: message,
          timestamp: new Date().toISOString()
        }
      );
      console.log(`✅ Real-time notification sent via Pusher`);
    } catch (pusherError) {
      console.log(`⚠️ Pusher notification failed (but database notification was created):`, pusherError.message);
    }
    
    console.log(`✅ Test notification sent to homeowner ${homeownerId}`);
    
    res.json({
      success: true,
      message: 'Test notification sent',
      notification: notification
    });
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      detail: error.message
    });
  }
});

// ✅ Test route to send notification for a specific tender
router.post('/test/tender/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    const { contractorName = 'Test Contractor', bidAmount = 50000 } = req.body;
    
    console.log(`🧪 Sending test bid notification for tender ${tenderId}`);
    
    // Get tender details
    const Tender = (await import('../models/Tender.js')).default;
    const tender = await Tender.findById(tenderId);
    
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    
    if (!tender.homeownerId) {
      return res.status(400).json({ 
        error: 'Tender does not have homeownerId',
        tender: {
          _id: tender._id,
          title: tender.title,
          homeownerId: tender.homeownerId,
          homeownerName: tender.homeownerName
        }
      });
    }
    
    console.log(`✅ Found tender with homeownerId:`, tender.homeownerId);
    
    // Create notification data
    const notificationData = {
      type: 'new_bid',
      message: `Test bid submitted by ${contractorName} for tender "${tender.title || 'Untitled'}"`,
      tender: tender._id,
      tenderTitle: tender.title || 'Untitled',
      contractorName: contractorName,
      bidAmount: bidAmount,
      timestamp: new Date().toISOString()
    };
    
    // Save notification in database
    const notification = await Notification.create({
      userId: tender.homeownerId,
      userType: 'homeowner',
      ...notificationData
    });
    
    console.log(`✅ Test bid notification created in database:`, notification);
    
    // Send real-time notification via Pusher
    try {
      await sendNotificationToSpecificHomeowner(
        tender.homeownerId.toString(),
        EVENTS.NEW_BID,
        notificationData
      );
      console.log(`✅ Real-time bid notification sent via Pusher`);
    } catch (pusherError) {
      console.log(`⚠️ Pusher notification failed (but database notification was created):`, pusherError.message);
    }
    
    res.json({
      success: true,
      message: 'Test bid notification sent',
      notification: notification,
      tender: {
        _id: tender._id,
        title: tender.title,
        homeownerId: tender.homeownerId,
        homeownerName: tender.homeownerName
      }
    });
  } catch (error) {
    console.error('❌ Error sending test bid notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test bid notification',
      detail: error.message
    });
  }
});

export default router; 