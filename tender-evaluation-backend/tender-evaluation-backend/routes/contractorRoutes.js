import express from "express";
import Contractor from "../models/Contractor.js";
import { body, validationResult } from "express-validator";
import mongoose from 'mongoose';
import Notification from "../models/Notification.js";

import {
  contractorSignup,
  getAllContractors,
  getContractorById,
  verifyContractor,
  deleteContractor,
  getAvailableTenders,
  submitBid,
  getContractorBids,
  getMaterialPrices,
  updateContractorProfile,
  getContractorStats,
  checkContractorStatus,
  getContractorByUid
} from "../controller/contractorController.js";


const router = express.Router();

// Validation middleware for contractor signup
const contractorSignupValidation = [
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 50 characters"),
  
  body("email")
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail(),
  
  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please enter a valid phone number"),
  
  body("companyName")
    .notEmpty()
    .withMessage("Company name is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters"),
  
  body("companyRegistrationNumber")
    .notEmpty()
    .withMessage("Company registration number is required")
    .trim(),
  
  body("businessAddress")
    .notEmpty()
    .withMessage("Business address is required")
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage("Business address must be between 10 and 200 characters"),
  
  body("licenseNumber")
    .notEmpty()
    .withMessage("License number is required")
    .trim(),
  
  body("yearsOfExperience")
    .isInt({ min: 0, max: 50 })
    .withMessage("Years of experience must be a number between 0 and 50"),
  
  body("specialization")
    .notEmpty()
    .withMessage("Specialization is required")
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Specialization must be between 5 and 100 characters"),
  
  body("portfolioLink")
    .optional()
    .isURL()
    .withMessage("Portfolio link must be a valid URL"),
  
  body("references")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("References must not exceed 500 characters"),
];

// Validation middleware for contractor verification
const contractorVerificationValidation = [
  body("status")
    .isIn(["pending", "verified", "rejected"])
    .withMessage("Status must be pending, verified, or rejected"),
  
  body("verificationNotes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Verification notes must not exceed 500 characters"),
  
  body("verifiedBy")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Verified by must not exceed 50 characters"),
];

// Common validation result checker
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: errors.array()[0].msg
    });
  }
  next();
};

// Contractor signup route (with file uploads)
router.post(
  "/signup",
  contractorSignup
);

// Get all contractors (admin only)
router.get("/", getAllContractors);

// Get contractor by ID (admin only)
router.get("/:id", getContractorById);

// Verify contractor (admin only)
router.put(
  "/:id/verify",
  contractorVerificationValidation,
  validate,
  verifyContractor
);

// Delete contractor (admin only)
router.delete("/:id", deleteContractor);

// Contractor Dashboard Routes
// Get available tenders
router.get("/tenders/available", getAvailableTenders);

// Submit a bid
router.post("/bids/submit", submitBid);

// Get contractor's bids
router.get("/bids/:contractorId", getContractorBids);

// Get material prices
router.get("/materials/prices", getMaterialPrices);

// Update contractor profile
router.put("/profile/:id", updateContractorProfile);

// Get contractor dashboard stats
router.get("/stats/:contractorId", getContractorStats);

// Check contractor verification status
router.get("/status/:email", checkContractorStatus);

// Get contractor by UID
router.get("/by-uid/:uid", getContractorByUid);

router.put('/:id/verify-documents', [
  body('documentType').isIn(['licenseFile', 'registrationCertificate', 'insuranceDocument']),
  body('status').isIn(['verified', 'rejected'])
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentType, status } = req.body;
    const contractorId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(contractorId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Prepare update
    const update = {
      [`documents.${documentType}.status`]: status,
      [`documents.${documentType}.verifiedAt`]: new Date(),
      // [`documents.${documentType}.verifiedBy`]: req.user.id // Uncomment if using auth
    };

    // Update document status
    const contractor = await Contractor.findByIdAndUpdate(
      contractorId,
      { $set: update },
      { new: true }
    );

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    if (!contractor.documents[documentType]) {
      return res.status(400).json({ 
        error: 'Document not found',
        availableDocuments: Object.keys(contractor.documents) 
      });
    }

    // Check if all required docs are verified
    const requiredDocs = ['licenseFile', 'registrationCertificate'];
    const allVerified = requiredDocs.every(
      doc => contractor.documents[doc]?.status === 'verified'
    );

    if (allVerified) {
      await Contractor.findByIdAndUpdate(
        contractorId,
        { status: 'verified', documentStatus: 'verified' }
      );
    }

    res.json({ 
      success: true,
      message: `Document ${documentType} ${status} successfully`
    });

  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({ 
      error: 'Document verification failed',
      details: error.message 
    });
  }
});

router.get('/:id/check-completeness', async (req, res) => {
  try {
    const contractor = await Contractor.findById(req.params.id);
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    const requiredFields = {
      fullName: contractor.fullName,
      email: contractor.email,
      phoneNumber: contractor.phoneNumber,
      companyName: contractor.companyName,
      companyRegistrationNumber: contractor.companyRegistrationNumber,
      licenseNumber: contractor.licenseNumber,
      businessAddress: contractor.businessAddress,
      yearsOfExperience: contractor.yearsOfExperience,
      specialization: contractor.specialization,
      licenseVerified: contractor.documents?.licenseFile?.status === 'verified',
      registrationVerified: contractor.documents?.registrationCertificate?.status === 'verified'
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    res.json({
      isComplete: missingFields.length === 0,
      missingFields,
      profile: contractor
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
});

export default router;