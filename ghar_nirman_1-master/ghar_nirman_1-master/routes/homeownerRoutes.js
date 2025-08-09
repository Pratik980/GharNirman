import express from "express";
import { getHomeownerProfile, updateHomeownerProfile } from "../controller/homeownerController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get homeowner profile
router.get("/profile", authenticateToken, getHomeownerProfile);

// Update homeowner profile
router.put("/profile", authenticateToken, updateHomeownerProfile);

export default router;