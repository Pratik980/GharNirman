import mongoose from "mongoose";

const tenderSchema = new mongoose.Schema({
  // Homeowner tender fields
  title: { type: String, trim: true },
  description: { type: String },
  budget: { type: String, trim: true },
  location: { type: String, trim: true },
  startDate: { type: String },
  endDate: { type: String },
  deadline: { type: String },
  visibility: { type: String, enum: ["Public", "Private"], default: "Public" },
  notes: { type: String },
  homeownerId: { type: String, trim: true },
  homeownerName: { type: String, trim: true },
  
  // Contractor bid fields (existing)
  contractor: { type: String, trim: true },
  licenseCategory: { type: String, trim: true },
  bidAmount: { type: Number, min: 0, default: 0 },
  projectDuration: { type: Number, min: 0, default: 0 },
  warranty: { type: Number, min: 0, default: 0 },
  experience: { type: Number, min: 0, default: 0 },
  successRate: { type: Number, min: 0, max: 100, default: 0 },
  clientRating: { type: Number, min: 0, max: 100, default: 0 },
  rejectionHistory: { type: Number, min: 0, default: 0 },
  safetyCertification: { type: String, trim: true },
  materialSourceCertainty: { type: Number, min: 0, max: 100, default: 0 },
  
  // Additional fields from TenderCreationForm
  projectType: { type: String, trim: true },
  siteVisit: { type: String, enum: ["Yes", "No"] },
  materials: { type: String, trim: true },
  safetyCert: { type: String, trim: true },
  
  // File/document fields
  documentsPath: { type: String, trim: true },
  originalFilename: { type: String, trim: true },
  extractedText: { type: String },
  
  // Status and metadata
  status: { type: String, enum: ["open", "closed", "awarded", "cancelled"], default: "open" },
  bids: { type: Number, min: 0, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model("Tender", tenderSchema);
