import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true } // ✅ Adds createdAt and updatedAt fields
);

const Contact = mongoose.model("Contact", contactSchema);
export default Contact;
