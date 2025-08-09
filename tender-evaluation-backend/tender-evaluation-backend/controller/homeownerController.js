import User from "../models/User.js";

// Get homeowner profile
export const getHomeownerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.userType !== "homeowner") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only homeowners can access this endpoint."
      });
    }

    // Return profile data (excluding sensitive information)
    const profileData = {
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
      emailNotifications: user.emailNotifications !== false,
      smsNotifications: user.smsNotifications !== false,
      pushNotifications: user.pushNotifications !== false,
      photoURL: user.photoURL,
      userType: user.userType
    };

    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error("Get homeowner profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile"
    });
  }
};

// Update homeowner profile
export const updateHomeownerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.userType !== "homeowner") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only homeowners can access this endpoint."
      });
    }

    // Define allowed fields to update
    const allowedFields = [
      'fullName', 
      'phoneNumber', 
      'address', 
      'emailNotifications', 
      'smsNotifications', 
      'pushNotifications'
    ];

    // Filter out non-allowed fields
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      filteredData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber || "",
        address: updatedUser.address || "",
        emailNotifications: updatedUser.emailNotifications !== false,
        smsNotifications: updatedUser.smsNotifications !== false,
        pushNotifications: updatedUser.pushNotifications !== false,
        photoURL: updatedUser.photoURL,
        userType: updatedUser.userType
      }
    });

  } catch (error) {
    console.error("Update homeowner profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};