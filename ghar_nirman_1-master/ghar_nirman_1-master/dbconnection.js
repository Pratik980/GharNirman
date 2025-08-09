import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tender_evaluation";

const dbConnect = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      connectTimeoutMS: 10000, // 10s timeout for initial connection
      serverSelectionTimeoutMS: 10000, // 10s timeout for server selection
    });
    console.log("MongoDB Connected Successfully...");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    console.log("⚠️  Server will start without database connection. Some features may not work.");
    // Don't exit process, just log the error
  }
};

export default dbConnect;
