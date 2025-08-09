import mongoose from "mongoose";

const documentSubSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending"
  },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String }
}, { _id: false });

const contractorSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [8, "UID must be at least 8 characters long"],
      maxlength: [50, "UID cannot exceed 50 characters"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Full name must be at least 2 characters long"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
      maxlength: [255, "Email cannot exceed 255 characters"],
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s-]{10,15}$/, "Please enter a valid phone number (10-15 digits)"],
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Company name must be at least 2 characters long"],
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },
    companyRegistrationNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Z0-9-]{6,20}$/, "Company registration number must be 6-20 alphanumeric characters"],
    },
    businessAddress: {
      type: String,
      required: true,
      trim: true,
      minlength: 5
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Z0-9-]{6,20}$/, "License number must be 6-20 alphanumeric characters"],
      unique: true,
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      min: [0, "Years of experience cannot be negative"],
      max: [100, "Years of experience cannot exceed 100"],
    },
    specialization: {
      type: String,
      required: true,
      trim: true
      // Removed enum restriction to allow any value
    },
    portfolioLink: {
      type: String,
      trim: true,
      match: [/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, "Please enter a valid URL or leave empty"],
      default: "",
      maxlength: [255, "Portfolio link cannot exceed 255 characters"],
    },
    references: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "References cannot exceed 1000 characters"],
    },
    successRate: {
      type: Number,
      default: 0,
      min: [0, "Success rate cannot be negative"],
      max: [100, "Success rate cannot exceed 100"],
    },
    clientRating: {
      type: Number,
      default: 0,
      min: [0, "Client rating cannot be negative"],
      max: [100, "Client rating cannot exceed 100"],
    },
    rejectionHistory: {
      type: Number,
      default: 0,
      min: [0, "Rejection history cannot be negative"],
    },
    safetyCertification: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "Safety certification cannot exceed 100 characters"],
    },
    documents: {
      licenseFile: { type: documentSubSchema, required: true },
      registrationCertificate: { type: documentSubSchema, required: true },
      insuranceDocument: { type: documentSubSchema },
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    documentStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verificationNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Verification notes cannot exceed 1000 characters"],
    },
    verifiedBy: {
      type: String,
      trim: true,
      maxlength: [100, "Verified by cannot exceed 100 characters"],
    },
    verifiedAt: {
      type: Date,
    },
    lastUpdatedBy: {
      type: String,
      trim: true,
      maxlength: [100, "Last updated by cannot exceed 100 characters"],
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
contractorSchema.index({ email: 1 }, { unique: true });
contractorSchema.index({ uid: 1 }, { unique: true });
contractorSchema.index({ licenseNumber: 1 }, { unique: true });
contractorSchema.index({ status: 1 });
contractorSchema.index({ createdAt: -1 });

const Contractor = mongoose.model("Contractor", contractorSchema);

export default Contractor;