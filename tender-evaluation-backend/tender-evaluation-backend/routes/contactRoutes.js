// backend/routes/contactRoutes.js
import express from "express";
import Contact from "../models/Contact.js"; // ✅ Correct path for the model

const router = express.Router();

// ✅ Route to store contact form messages
router.post("/contact", async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Save message to MongoDB
    const newContact = new Contact({ name, phone, message });
    await newContact.save();

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Contact Form Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
