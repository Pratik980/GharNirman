import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixContractorIndex = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/tender-evaluation-backend";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get the contractors collection
    const db = mongoose.connection.db;
    const contractorsCollection = db.collection("contractors");

    // List all indexes
    const indexes = await contractorsCollection.indexes();
    console.log("📋 Current indexes:", indexes);

    // Drop the email index if it exists
    try {
      await contractorsCollection.dropIndex("email_1");
      console.log("✅ Dropped email_1 index");
    } catch (error) {
      if (error.code === 26) {
        console.log("ℹ️ email_1 index doesn't exist, skipping...");
      } else {
        console.error("❌ Error dropping email index:", error);
      }
    }

    // Drop the uid index if it exists
    try {
      await contractorsCollection.dropIndex("uid_1");
      console.log("✅ Dropped uid_1 index");
    } catch (error) {
      if (error.code === 26) {
        console.log("ℹ️ uid_1 index doesn't exist, skipping...");
      } else {
        console.error("❌ Error dropping uid index:", error);
      }
    }

    // Create a new sparse index for email
    try {
      await contractorsCollection.createIndex({ email: 1 }, { sparse: true });
      console.log("✅ Created new sparse email index");
    } catch (error) {
      console.error("❌ Error creating email index:", error);
    }

    // Create a new sparse index for uid
    try {
      await contractorsCollection.createIndex({ uid: 1 }, { sparse: true });
      console.log("✅ Created new sparse uid index");
    } catch (error) {
      console.error("❌ Error creating uid index:", error);
    }

    console.log("✅ Index fix completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing contractor index:", error);
    process.exit(1);
  }
};

fixContractorIndex(); 