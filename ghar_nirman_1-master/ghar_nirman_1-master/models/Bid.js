import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    tender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tender",
      required: true,
    },
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contractor",
      required: true,
    },
    contractor_name: { type: String, default: "" },
    tenderTitle: { type: String, required: true }, // Added for frontend
    bidAmount: { type: Number, required: true },
    projectDuration: { type: Number }, // Added from frontend
    warranty: { type: Number }, // Added from frontend
    notes: { type: String }, // Added from frontend
    documents: [{ type: String }], // Added for file uploads
    experience: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    clientRating: { type: Number, default: 0 },
    rejectionHistory: { type: Number, default: 0 },
    safetyCertification: { type: String, default: "" },
    licenseCategory: { type: String, default: "" },
    specialization: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Under Review", "Accepted", "Rejected"], // Align with frontend
      default: "Under Review",
    },
    submissionDate: { type: Date, default: Date.now }, // Added for frontend
  },
  { timestamps: true }
);

const Bid = mongoose.model("Bid", bidSchema);
export default Bid;