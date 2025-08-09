import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: function () {
        return this.provider !== "google"; // Password required only if provider is NOT google
      },
    },
    userType: {
      type: String,
      enum: ["homeowner", "contractor", "admin"], // user roles only
      default: "homeowner",
    },
    uid: {
      type: String,
      unique: true,
      sparse: true,
      // This should match Firebase UID for linking users
    },
    photoURL: {
      type: String,
      default: "",
    },
    agreeToTerms: {
      type: Boolean,
      required: true,
    },
    provider: {
      type: String,
      enum: ["local", "google"], // auth provider type
      default: "local",
    },
    // Additional fields for homeowner profile
    phoneNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index on email + userType for faster queries
userSchema.index({ email: 1, userType: 1 });

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (this.provider === "google" || !this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare entered password with hashed password in DB
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
