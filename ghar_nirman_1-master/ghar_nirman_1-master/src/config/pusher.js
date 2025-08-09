import Pusher from 'pusher-js';

// Client-side Pusher configuration
export const pusher = new Pusher('3b9cc1c7a04ea336b908', {
  cluster: 'ap2',
  encrypted: true,
  authEndpoint: 'http://localhost:5000/pusher/auth',
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

// Helper function to subscribe to notifications
export const subscribeToNotifications = (channelName, eventName, callback) => {
  try {
    const channel = pusher.subscribe(channelName);
    
    channel.bind(eventName, (data) => {
      console.log(`📢 Received ${eventName} notification:`, data);
      callback(data);
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  } catch (error) {
    console.error(`❌ Error subscribing to ${channelName}:`, error);
    return () => {}; // Return empty cleanup function
  }
};

// Helper function to subscribe to private notifications
export const subscribeToPrivateNotifications = (userId, userType, eventName, callback) => {
  try {
    const channelName = `private-${userType}-${userId}`;
    const channel = pusher.subscribe(channelName);
    
    channel.bind(eventName, (data) => {
      console.log(`📢 Received private ${eventName} notification for ${userType} ${userId}:`, data);
      callback(data);
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  } catch (error) {
    console.error(`❌ Error subscribing to private channel for ${userType} ${userId}:`, error);
    return () => {}; // Return empty cleanup function
  }
};

export default pusher; 