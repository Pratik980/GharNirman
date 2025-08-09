import express from "express";
import { body, validationResult } from "express-validator";
import { signupUser, signinUser } from "../controller/authController.js";
import admin from "../firebase/firebaseAdmin.js";
import User from "../models/User.js";

const router = express.Router();

// Validation middleware for signup
const signupValidationRules = [
  body("fullName").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("A valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
  body("userType")
    .isIn(["homeowner", "contractor", "admin"])
    .withMessage("Invalid user type selected"),
  // Fix agreeToTerms validation: expect boolean true
  body("agreeToTerms")
    .custom((value) => value === true)
    .withMessage("You must agree to the terms and conditions"),
];

// Validation middleware for signin
const signinValidationRules = [
  body("email").isEmail().withMessage("A valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("userType")
    .isIn(["homeowner", "contractor", "admin"])
    .withMessage("Invalid user type selected"),
];

// Common validation result checker
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(422)
      .json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

// Signup route
router.post(
  "/signup",
  signupValidationRules,
  validate,
  async (req, res, next) => {
    try {
      console.log("Signup route hit with:", req.body);
      await signupUser(req, res, next);
    } catch (err) {
      console.error("Signup route error:", err.message);
      res
        .status(500)
        .json({ success: false, message: "Server error in signup route" });
    }
  }
);

// Signin route
router.post("/signin", signinValidationRules, validate, signinUser);

// Updated Google Authentication route
router.post("/google-auth", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res
      .status(400)
      .json({ success: false, message: "ID token is required" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture, firebase } = decodedToken;

    const user = await User.findOneAndUpdate(
      { email }, // Match by email
      {
        uid, // Save uid too
        email,
        fullName: name || "Unnamed User",
        photoURL: picture || "",
        userType: "google",
        provider: firebase?.sign_in_provider || "google",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const responseUser = {
      uid: user.uid,
      fullName: user.fullName,
      email: user.email,
      photoURL: user.photoURL,
      userType: user.userType,
      provider: user.provider,
    };

    return res.status(200).json({ success: true, user: responseUser });
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid ID token" });
  }
});

// Create homeowner record
router.post("/homeowner/create", async (req, res) => {
  try {
    const { uid, fullName, email, userType, photoURL, provider } = req.body;
    
    console.log('Creating homeowner with data:', { uid, fullName, email, userType, photoURL, provider });
    
    // First, try to find existing user by UID
    let existingHomeowner = await User.findOne({ uid, userType: 'homeowner' });
    
    if (existingHomeowner) {
      console.log('Homeowner already exists by UID:', existingHomeowner._id);
      const { password, __v, _id, ...homeownerData } = existingHomeowner.toObject();
      return res.status(200).json({ _id, ...homeownerData });
    }
    
    // If not found by UID, try to find by email
    existingHomeowner = await User.findOne({ email, userType: 'homeowner' });
    
    if (existingHomeowner) {
      console.log('Found existing homeowner by email, updating UID:', existingHomeowner._id);
      
      // Update the existing user with the new UID
      existingHomeowner.uid = uid;
      existingHomeowner.fullName = fullName;
      existingHomeowner.photoURL = photoURL || existingHomeowner.photoURL;
      existingHomeowner.provider = 'google';
      
      await existingHomeowner.save();
      console.log('Updated existing homeowner with new UID');
      
      const { password, __v, _id, ...homeownerData } = existingHomeowner.toObject();
      return res.status(200).json({ _id, ...homeownerData });
    }
    
    // Create new homeowner record only if no existing user found
    const newHomeowner = new User({
      uid,
      fullName,
      email,
      userType: 'homeowner',
      photoURL: photoURL || '',
      provider: 'google', // Use 'google' for Firebase users to avoid password requirement
      agreeToTerms: true
    });
    
    await newHomeowner.save();
    console.log('Created new homeowner:', newHomeowner._id);
    
    const { password, __v, _id, ...homeownerData } = newHomeowner.toObject();
    res.status(201).json({ _id, ...homeownerData });
    
  } catch (error) {
    console.error("Create homeowner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create homeowner",
      error: error.message
    });
  }
});

// Get homeowner by UID
router.get("/homeowner/by-uid/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    
    let homeowner = await User.findOne({ uid, userType: 'homeowner' });
    
    // If not found by UID, try to find by email (for cases where UID was updated)
    if (!homeowner) {
      console.log('Homeowner not found by UID, checking if UID needs to be updated...');
      // We can't search by email here since we don't have the email in the URL
      // This is just for logging purposes
    }
    
    if (!homeowner) {
      return res.status(404).json({
        success: false,
        message: "Homeowner not found"
      });
    }

    // Return homeowner data with _id
    const { password, __v, _id, ...homeownerData } = homeowner.toObject();
    res.status(200).json({ _id, ...homeownerData });
    
  } catch (error) {
    console.error("Get homeowner by UID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch homeowner",
      error: error.message
    });
  }
});

export default router;
