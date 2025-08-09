import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_default_jwt_secret";

// Sign Up Controller
export const signupUser = async (req, res) => {
  const { email, password, fullName, userType } = req.body;

  try {
    console.log("Signup attempt:", { email, userType });

    // Check if user already exists
    const existingUser = await User.findOne({ email }).maxTimeMS(5000);
    if (existingUser) {
      console.log("User already exists:", email);
      return res.status(400).json({
        success: false,
        message: "User already exists with this email address.",
      });
    }

    // Create new user
    const newUser = new User({
      fullName,
      email,
      password, // Plaintext password, hashed in the pre-save hook
      userType,
    });

    // Save user to DB
    await newUser.save();
    console.log("User saved:", newUser._id);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.userType,
        email: newUser.email,
      },
      JWT_SECRET,
      { expiresIn: "1d" } // Expiry time
    );

    // Respond with success and token
    res.status(201).json({
      success: true,
      message: "Sign up successful",
      token,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        userType: newUser.userType,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// Sign In Controller
export const signinUser = async (req, res) => {
  const { email, password, userType } = req.body;

  try {
    console.log("Signin attempt:", { email, userType });

    // Find the user by email and userType
    const existingUser = await User.findOne({ email, userType }).maxTimeMS(
      5000
    );
    if (!existingUser) {
      console.log("No user found, sending 404...");
      return res.status(404).json({
        success: false,
        message: "User not found. Please check your credentials.",
      });
    }

    // Check password match
    const isMatch = await existingUser.matchPassword(password);
    if (!isMatch) {
      console.log("Password mismatch, sending 400...");
      return res.status(400).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: existingUser._id,
        role: existingUser.userType,
        email: existingUser.email,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Respond with success and token
    console.log("Signin successful, sending response...");
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: existingUser._id,
        fullName: existingUser.fullName,
        email: existingUser.email,
        userType: existingUser.userType,
      },
    });
  } catch (error) {
    console.error("Signin Error:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
