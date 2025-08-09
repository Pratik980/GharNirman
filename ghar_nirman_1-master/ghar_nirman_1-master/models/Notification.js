import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // For contractor notifications (legacy)
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor' },
  
  // For homeowner notifications (new)
  userId: { type: String }, // Can be ObjectId or string
  userType: { type: String, enum: ['contractor', 'homeowner', 'admin'] },
  
  // Common fields
  type: { type: String, default: 'general' },
  message: String,
  tender: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender' },
  tenderTitle: String,
  bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
  contractorName: String,
  bidAmount: Number,
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

// Add validation to ensure either contractorId or userId is present
notificationSchema.pre('save', function(next) {
  if (!this.contractorId && !this.userId) {
    return next(new Error('Either contractorId or userId is required'));
  }
  next();
});

export default mongoose.model('Notification', notificationSchema); 