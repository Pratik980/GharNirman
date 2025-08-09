import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher configuration
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "2031527",
  key: process.env.PUSHER_KEY || "3b9cc1c7a04ea336b908",
  secret: process.env.PUSHER_SECRET || "c0a54a788a85724653c2",
  cluster: process.env.PUSHER_CLUSTER || "ap2",
  useTLS: true
});

// Client-side Pusher configuration
export const pusherClient = new PusherClient(process.env.PUSHER_KEY || "3b9cc1c7a04ea336b908", {
  cluster: process.env.PUSHER_CLUSTER || "ap2",
});

// Notification channels
export const CHANNELS = {
  CONTRACTORS: 'contractors',
  HOMEOWNERS: 'homeowners', 
  ADMINS: 'admins',
  TENDERS: 'tenders',
  BIDS: 'bids',
  CONTRACTOR_APPROVALS: 'contractor-approvals'
};

// Event types
export const EVENTS = {
  NEW_TENDER: 'new-tender',
  NEW_BID: 'new-bid',
  CONTRACTOR_APPROVAL_REQUEST: 'contractor-approval-request',
  CONTRACTOR_APPROVED: 'contractor-approved',
  CONTRACTOR_REJECTED: 'contractor-rejected',
  BID_ACCEPTED: 'bid-accepted',
  BID_REJECTED: 'bid-rejected',
  GENERAL_NOTIFICATION: 'general-notification'
};

// Helper functions for sending notifications
export const sendNotificationToContractors = async (event, data) => {
  try {
    await pusher.trigger(CHANNELS.CONTRACTORS, event, data);
    console.log(`📢 Sent ${event} notification to contractors:`, data);
  } catch (error) {
    console.error('❌ Error sending notification to contractors:', error);
  }
};

export const sendNotificationToHomeowners = async (event, data) => {
  try {
    await pusher.trigger(CHANNELS.HOMEOWNERS, event, data);
    console.log(`📢 Sent ${event} notification to homeowners:`, data);
  } catch (error) {
    console.error('❌ Error sending notification to homeowners:', error);
  }
};

export const sendNotificationToAdmins = async (event, data) => {
  try {
    await pusher.trigger(CHANNELS.ADMINS, event, data);
    console.log(`📢 Sent ${event} notification to admins:`, data);
  } catch (error) {
    console.error('❌ Error sending notification to admins:', error);
  }
};

export const sendNotificationToSpecificContractor = async (contractorId, event, data) => {
  try {
    await pusher.trigger(`private-contractor-${contractorId}`, event, data);
    console.log(`📢 Sent ${event} notification to contractor ${contractorId}:`, data);
  } catch (error) {
    console.error(`❌ Error sending notification to contractor ${contractorId}:`, error);
  }
};

export const sendNotificationToSpecificHomeowner = async (homeownerId, event, data) => {
  try {
    await pusher.trigger(`private-homeowner-${homeownerId}`, event, data);
    console.log(`📢 Sent ${event} notification to homeowner ${homeownerId}:`, data);
  } catch (error) {
    console.error(`❌ Error sending notification to homeowner ${homeownerId}:`, error);
  }
};

export const sendNotificationToSpecificAdmin = async (adminId, event, data) => {
  try {
    await pusher.trigger(`private-admin-${adminId}`, event, data);
    console.log(`📢 Sent ${event} notification to admin ${adminId}:`, data);
  } catch (error) {
    console.error(`❌ Error sending notification to admin ${adminId}:`, error);
  }
}; 