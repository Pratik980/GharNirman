import Contractor from "../models/Contractor.js";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendNotificationToAdmins, EVENTS } from "../config/pusher.js";

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads/contractors/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed!'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).fields([
  { name: 'contractorLicense', maxCount: 1 },
  { name: 'businessRegistration', maxCount: 1 },
  { name: 'insuranceCertificate', maxCount: 1 }
]);

// Contractor signup with file uploads
export const contractorSignup = async (req, res) => {
  try {
    // Handle file uploads
    upload(req, res, async function(err) {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }

      console.log("Contractor signup request:", req.body);
      console.log("Uploaded files:", req.files);
      console.log("Files structure:", {
        contractorLicense: req.files?.contractorLicense,
        businessRegistration: req.files?.businessRegistration,
        insuranceCertificate: req.files?.insuranceCertificate
      });

      const {
        fullName,
        email,
        phoneNumber,
        companyName,
        companyRegistrationNumber,
        businessAddress,
        licenseNumber,
        yearsOfExperience,
        specialization,
        portfolioLink,
        references,
        uid
      } = req.body;

      // Manual validation for required fields
      if (!fullName || !email || !phoneNumber || !companyName || !companyRegistrationNumber || 
          !businessAddress || !licenseNumber || !yearsOfExperience || !specialization) {
        return res.status(422).json({
          success: false,
          message: "All required fields must be provided"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(422).json({
          success: false,
          message: "Please provide a valid email address"
        });
      }

      // Validate phone number
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(422).json({
          success: false,
          message: "Please provide a valid phone number"
        });
      }

      // Validate required documents
      if (!req.files?.contractorLicense || !req.files?.businessRegistration) {
        return res.status(422).json({
          success: false,
          message: "Contractor license and business registration documents are required"
        });
      }

          // Check if contractor already exists
      const existingContractor = await Contractor.findOne({ email });
      if (existingContractor) {
        return res.status(400).json({
          success: false,
          message: "Contractor with this email already exists"
        });
      }

      // Prepare documents object with full subdocument info
      const documents = {
        licenseFile: req.files?.contractorLicense?.[0]
          ? {
              filePath: req.files.contractorLicense[0].path,
              fileName: req.files.contractorLicense[0].filename,
              fileType: req.files.contractorLicense[0].mimetype,
              uploadDate: new Date(),
              status: "pending"
            }
          : null,
        registrationCertificate: req.files?.businessRegistration?.[0]
          ? {
              filePath: req.files.businessRegistration[0].path,
              fileName: req.files.businessRegistration[0].filename,
              fileType: req.files.businessRegistration[0].mimetype,
              uploadDate: new Date(),
              status: "pending"
            }
          : null,
        insuranceDocument: req.files?.insuranceCertificate?.[0]
          ? {
              filePath: req.files.insuranceCertificate[0].path,
              fileName: req.files.insuranceCertificate[0].filename,
              fileType: req.files.insuranceCertificate[0].mimetype,
              uploadDate: new Date(),
              status: "pending"
            }
          : null
      };
      
      console.log("Prepared documents object:", documents);

      // Create new contractor
      const contractor = new Contractor({
        uid,
        fullName,
        email,
        phoneNumber,
        companyName,
        companyRegistrationNumber,
        businessAddress,
        licenseNumber,
        yearsOfExperience,
        specialization,
        portfolioLink,
        references,
        documents
      });

      await contractor.save();

      console.log("Contractor saved successfully:", contractor._id);

      // Create notification for admin about new contractor signup
      const notificationData = {
        type: 'contractor_signup',
        message: `New contractor signup: ${contractor.fullName} from ${contractor.companyName}`,
        contractor: contractor._id,
        contractorName: contractor.fullName,
        companyName: contractor.companyName,
      };

      // Save notification for all admins (we'll use a placeholder admin ID for now)
      // In a real system, you'd have admin users in the database
      const adminId = new mongoose.Types.ObjectId(); // Placeholder admin ID
      await Notification.create({
        userId: adminId,
        userType: 'admin',
        ...notificationData
      });

      // Send real-time notification to all online admins
      sendNotificationToAdmins(notificationData);

      res.status(201).json({
        success: true,
        message: "Contractor application submitted successfully",
        contractor: {
          id: contractor._id,
          fullName: contractor.fullName,
          email: contractor.email,
          companyName: contractor.companyName,
          status: contractor.status
        }
      });
    });
  } catch (error) {
    console.error("Contractor signup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit contractor application",
      error: error.message
    });
  }
};

// Get all contractors for admin
export const getAllContractors = async (req, res) => {
  try {
    const contractors = await Contractor.find().sort({ createdAt: -1 });
    
    console.log("All contractors fetched:", contractors.length);
    contractors.forEach((contractor, index) => {
      console.log(`Contractor ${index + 1}:`, {
        name: contractor.fullName,
        email: contractor.email,
        documents: contractor.documents
      });
    });
    
    res.status(200).json({
      success: true,
      contractors
    });
  } catch (error) {
    console.error("Get contractors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contractors",
      error: error.message
    });
  }
};

// Get contractor by ID
export const getContractorById = async (req, res) => {
  try {
    const { id } = req.params;
    const contractor = await Contractor.findById(id);
    
    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    // Return the contractor object directly
    res.status(200).json(contractor);
  } catch (error) {
    console.error("Get contractor by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contractor",
      error: error.message
    });
  }
};

// Get contractor by UID
export const getContractorByUid = async (req, res) => {
  try {
    const { uid } = req.params;
    
    const contractor = await Contractor.findOne({ uid });
    
    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    // Return all contractor data except sensitive fields, and ensure _id is present
const { password, __v, _id, ...contractorData } = contractor.toObject();
res.status(200).json({ _id, ...contractorData });
    
  } catch (error) {
    console.error("Get contractor by UID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contractor",
      error: error.message
    });
  }
};

// Verify contractor (admin only)
export const verifyContractor = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationNotes, verifiedBy } = req.body;

    if (!["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be pending, verified, or rejected"
      });
    }

    const contractor = await Contractor.findById(id);
    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    contractor.status = status;
    contractor.verificationNotes = verificationNotes || "";
    contractor.verifiedBy = verifiedBy || "admin";
    contractor.verifiedAt = new Date();

    await contractor.save();

    // If contractor is verified, update Firestore status
    if (status === "verified") {
      try {
        // Note: The actual Firebase Auth account and Firestore document 
        // are created during contractor signup on the frontend.
        // Here we just log that verification is complete.
        
        console.log(`Contractor ${contractor.email} verified - Firebase account already exists from signup`);
        
        // The frontend login process will check both MongoDB status and Firestore status
        // to ensure proper verification flow
        
      } catch (firebaseError) {
        console.error("Firebase verification error:", firebaseError);
        // Continue with verification even if Firebase fails
      }
    }

    // Send email notification to contractor
    try {
      const emailSubject = status === "verified" 
        ? "Your Contractor Application Has Been Approved!" 
        : "Your Contractor Application Status Update";
      
      const emailBody = status === "verified"
        ? `Dear ${contractor.fullName},\n\nCongratulations! Your contractor application has been approved. You can now log in to your account and start bidding on projects.\n\nBest regards,\nGhar Nirman Team`
        : `Dear ${contractor.fullName},\n\nYour contractor application has been ${status}.\n\nReason: ${verificationNotes || "No specific reason provided"}\n\nIf you have any questions, please contact us.\n\nBest regards,\nGhar Nirman Team`;

      console.log(`Email notification sent to ${contractor.email}: ${emailSubject}`);
    } catch (emailError) {
      console.error("Email notification error:", emailError);
    }

    res.status(200).json({
      success: true,
      message: `Contractor ${status} successfully`,
      contractor: {
        id: contractor._id,
        fullName: contractor.fullName,
        email: contractor.email,
        companyName: contractor.companyName,
        status: contractor.status,
        verifiedAt: contractor.verifiedAt,
        verificationNotes: contractor.verificationNotes
      }
    });

  } catch (error) {
    console.error("Verify contractor error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify contractor",
      error: error.message
    });
  }
};

// Delete contractor
export const deleteContractor = async (req, res) => {
  try {
    const { id } = req.params;
    const contractor = await Contractor.findByIdAndDelete(id);
    
    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Contractor deleted successfully"
    });
  } catch (error) {
    console.error("Delete contractor error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contractor",
      error: error.message
    });
  }
};

// Get available tenders for contractors
export const getAvailableTenders = async (req, res) => {
  try {
    // Mock tenders data - in real app, this would come from Tender model
    const tenders = [
      {
        id: 1,
        title: "Residential House Construction",
        budget: [50000, 70000],
        location: "Lagankhel",
        deadline: "2026-10-15",
        complexity: 4,
        acceptanceProbability: 78,
        cluster: "High-Value Specialist",
        description: "Construction of a 3-story residential building with modern amenities",
        eligibility: "Class A contractor license, 5+ years experience, liability insurance"
      },
      {
        id: 2,
        title: "Kitchen Renovation",
        budget: [15000, 20000],
        location: "Bhaktapur",
        deadline: "2026-07-25",
        complexity: 2,
        acceptanceProbability: 45,
        cluster: "Medium-Scale Renovation",
        description: "Complete kitchen remodeling including cabinets, countertops and appliances",
        eligibility: "Renovation specialty, portfolio of past projects"
      },
      {
        id: 3,
        title: "Commercial Office Fit-out",
        budget: [120000, 150000],
        location: "Biratnagar",
        deadline: "2026-09-10",
        complexity: 5,
        acceptanceProbability: 92,
        cluster: "Premium Commercial",
        description: "Interior fit-out for a 10,000 sq ft office space",
        eligibility: "Commercial construction experience, safety certification"
      }
    ];

    res.status(200).json({
      success: true,
      tenders
    });
  } catch (error) {
    console.error("Get tenders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenders",
      error: error.message
    });
  }
};

// Submit a bid for a tender
export const submitBid = async (req, res) => {
  try {
    const { tenderId, amount, timeline, notes, contractorId } = req.body;

    // Mock bid submission - in real app, this would save to Bid model
    const newBid = {
      id: Date.now(),
      tenderId,
      contractorId,
      amount: parseFloat(amount),
      timeline: parseInt(timeline),
      notes,
      status: "Under Review",
      submissionDate: new Date().toISOString().split('T')[0],
      documents: [],
      evaluationScore: Math.floor(Math.random() * 20) + 75, // Mock score
      costDeviation: (Math.random() - 0.5) * 10 // Mock deviation
    };

    res.status(201).json({
      success: true,
      message: "Bid submitted successfully",
      bid: newBid
    });
  } catch (error) {
    console.error("Submit bid error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit bid",
      error: error.message
    });
  }
};

// Get contractor's bids
export const getContractorBids = async (req, res) => {
  try {
    const { contractorId } = req.params;

    // Mock bids data - in real app, this would come from Bid model
    const bids = [
      {
        id: 1,
        tenderId: 1,
        tenderTitle: "Residential House Construction",
        amount: 65000,
        status: "Under Review",
        submissionDate: "2025-06-01",
        timeline: 180,
        documents: ["bid-proposal.pdf", "drawings.pdf"],
        evaluationScore: 87,
        costDeviation: 3.2
      },
      {
        id: 2,
        tenderId: 2,
        tenderTitle: "Kitchen Renovation",
        amount: 18500,
        status: "Accepted",
        submissionDate: "2025-04-15",
        timeline: 45,
        documents: ["proposal-kitchen.pdf"],
        evaluationScore: 92,
        costDeviation: -1.5
      },
      {
        id: 3,
        tenderId: 3,
        tenderTitle: "Commercial Office Fit-out",
        amount: 142000,
        status: "Rejected",
        submissionDate: "2025-05-20",
        timeline: 120,
        documents: ["office-fitout-proposal.pdf", "floorplan.pdf"],
        evaluationScore: 78,
        costDeviation: 7.8
      }
    ];

    res.status(200).json({
      success: true,
      bids
    });
  } catch (error) {
    console.error("Get contractor bids error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bids",
      error: error.message
    });
  }
};

// Get material prices
export const getMaterialPrices = async (req, res) => {
  try {
    // Mock material prices - in real app, this would come from Material model
    const materials = [
      { id: 1, name: "Concrete (per m³)", currentPrice: 125, trend: "up", lastUpdated: "2025-07-18" },
      { id: 2, name: "Steel Rebar (per ton)", currentPrice: 780, trend: "stable", lastUpdated: "2025-07-18" },
      { id: 3, name: "Lumber (per board ft)", currentPrice: 3.20, trend: "down", lastUpdated: "2025-07-18" },
      { id: 4, name: "Drywall (per sheet)", currentPrice: 12.50, trend: "stable", lastUpdated: "2025-07-18" },
    ];

    res.status(200).json({
      success: true,
      materials
    });
  } catch (error) {
    console.error("Get material prices error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch material prices",
      error: error.message
    });
  }
};

// Update contractor profile
export const updateContractorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const contractor = await Contractor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      contractor
    });
  } catch (error) {
    console.error("Update contractor profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

// Get contractor dashboard stats
export const getContractorStats = async (req, res) => {
  try {
    const { contractorId } = req.params;

    // Mock stats - in real app, this would be calculated from actual data
    const stats = {
      activeBids: 12,
      wonProjects: 5,
      pendingApprovals: 3,
      winRate: 65,
      avgEvaluation: 82,
      totalValue: 450000
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Get contractor stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: error.message
    });
  }
};

// Check contractor verification status
export const checkContractorStatus = async (req, res) => {
  try {
    const { email } = req.params;

    const contractor = await Contractor.findOne({ email });
    
    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    res.status(200).json({
      success: true,
      contractor: {
        id: contractor._id,
        fullName: contractor.fullName,
        email: contractor.email,
        companyName: contractor.companyName,
        status: contractor.status,
        verifiedAt: contractor.verifiedAt,
        verificationNotes: contractor.verificationNotes
      }
    });
  } catch (error) {
    console.error("Check contractor status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check contractor status",
      error: error.message
    });
  }
}; 