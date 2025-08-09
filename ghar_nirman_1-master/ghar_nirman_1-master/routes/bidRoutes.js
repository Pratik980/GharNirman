import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import Bid from "../models/Bid.js";
import Tender from "../models/Tender.js";
import Notification from "../models/Notification.js";
import { sendNotificationToSpecificHomeowner, sendNotificationToSpecificContractor, EVENTS } from "../config/pusher.js";


// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// =============================================================================
// MULTER SETUP (For Document Uploads)
// =============================================================================

const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "bid-doc-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// =============================================================================
// ROUTES
// =============================================================================

// ✅ Test route
router.get("/test", (req, res) => {
  res.json({ message: "Bid routes working!", timestamp: new Date().toISOString() });
});

// ✅ AI-powered PDF upload and bid extraction
router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    console.log("🔍 Starting AI-powered PDF upload and bid extraction...");
    console.log("📄 File:", req.file.filename);
    console.log("🎯 Tender ID:", req.body.tenderId);
    console.log("👤 Contractor ID:", req.body.contractor);

    // Path to the Python script
    const scriptPath = path.join(__dirname, "..", "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py");
    
    // Execute the Python script
    execFile("python", [scriptPath, "analyze", req.file.path], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error running AI extraction:", error);
        console.error("❌ stderr:", stderr);
        return res.status(500).json({
          error: "AI extraction failed",
          detail: error.message,
          stderr: stderr
        });
      }

      try {
        // Parse the JSON output from Python script
        const result = JSON.parse(stdout);
        
        if (!result.success) {
          return res.status(500).json({
            error: "AI extraction failed",
            detail: result.error || "Unknown error",
            traceback: result.traceback
          });
        }
        
        const extractedData = result.data;
        
        if (!extractedData || Object.keys(extractedData).length === 0) {
          return res.status(400).json({
            error: "No bid data extracted from PDF",
            detail: "The AI model could not extract any relevant bid information from the uploaded PDF"
          });
        }

        console.log("✅ AI extraction successful:", extractedData);

        // Save the extracted bid data to the database
        try {
          const newBid = new Bid({
            tender: req.body.tenderId,
            contractor: req.body.contractor,
            contractor_name: req.body.contractor_name || extractedData.contractor_name || "",
            tenderTitle: extractedData.contract_name || "AI-Extracted Tender",
            bidAmount: parseFloat(extractedData.bid_amount || 0),
            projectDuration: parseInt(extractedData.project_duration || 0),
            warranty: parseInt(extractedData.warranty_period || 0),
            notes: `AI-extracted from PDF: ${req.file.filename}`,
            documents: [req.file.path],
            experience: 0,
            successRate: parseFloat(extractedData.project_success_rate || 0),
            clientRating: parseFloat(extractedData.client_rating || 0),
            rejectionHistory: parseInt(extractedData.rejection_history || 0),
            safetyCertification: extractedData.safety_certification || "",
            licenseCategory: extractedData.license_category || "",
            specialization: extractedData.contractor_name || "",
            status: "Under Review",
            submissionDate: new Date(),
          });

          await newBid.save();
          console.log("✅ Bid saved to database:", newBid._id);

          // Update tender bid count
          if (req.body.tenderId) {
            await Tender.findByIdAndUpdate(req.body.tenderId, { $inc: { bids: 1 } });
            console.log("✅ Updated tender bid count");
          }

          // Get tender details for notification
          const tender = await Tender.findById(req.body.tenderId);
          console.log('🔍 Found tender for notification:', tender);
          console.log('🔍 Tender homeownerId:', tender?.homeownerId);
          console.log('🔍 Tender title:', tender?.title);
          
          if (tender) {
            // Create notification data
            const notificationData = {
              type: 'new_bid',
              message: `New bid submitted by ${req.body.contractor_name || 'a contractor'} for tender "${tender.title || tender.contractor || 'Untitled'}"`,
              tender: tender._id,
              bid: newBid._id,
              tenderTitle: tender.title || tender.contractor || 'Untitled',
              contractorName: req.body.contractor_name || 'Unknown Contractor',
              bidAmount: newBid.bidAmount,
              contractorId: req.body.contractor,
            };

            // Save notification for homeowner
            if (tender.homeownerId) {
              console.log('✅ Tender has homeownerId, creating notification for:', tender.homeownerId);
              
              try {
                // Save notification to database
                const savedNotification = await Notification.create({
                  userId: tender.homeownerId,
                  userType: 'homeowner',
                  ...notificationData
                });
                console.log('✅ Notification saved to database:', savedNotification._id);
                
                // Send real-time notification to homeowner via Pusher
                try {
                  await sendNotificationToSpecificHomeowner(
                    tender.homeownerId.toString(),
                    EVENTS.NEW_BID,
                    {
                      ...notificationData,
                      timestamp: new Date().toISOString()
                    }
                  );
                  console.log('📢 Sent real-time notification to homeowner:', tender.homeownerId);
                } catch (pusherError) {
                  console.error('❌ Pusher notification failed:', pusherError);
                  console.log('⚠️ Database notification was saved, but real-time notification failed');
                }
              } catch (dbError) {
                console.error('❌ Error saving notification to database:', dbError);
              }
            } else {
              console.log('❌ Tender does not have homeownerId, cannot send notification');
              console.log('🔍 Tender data:', {
                _id: tender._id,
                title: tender.title,
                homeownerId: tender.homeownerId,
                homeownerName: tender.homeownerName
              });
            }

            // Save notification for contractor (if needed by your app)
            try {
              await Notification.create({
                ...notificationData
              });
            } catch (contractorNotificationError) {
              console.error('❌ Error saving contractor notification:', contractorNotificationError);
            }

            // Notification saved to database for homeowner
          } else {
            console.log('❌ Tender not found for notification');
          }

          res.status(201).json({
            message: "AI analysis completed and bid saved successfully",
            filename: req.file.filename,
            extractedData: extractedData,
            savedBid: newBid,
            analysis: {
              success: true,
              data: extractedData,
              prediction: null
            }
          });

        } catch (dbError) {
          console.error("❌ Error saving bid to database:", dbError);
          res.status(500).json({
            error: "Failed to save bid to database",
            detail: dbError.message,
            extractedData: extractedData
          });
        }

      } catch (parseError) {
        console.error("❌ Error parsing AI extraction result:", parseError);
        console.error("❌ Raw stdout:", stdout);
        res.status(500).json({
          error: "Failed to parse AI extraction result",
          detail: parseError.message,
          stdout: stdout
        });
      }
    });

  } catch (error) {
    console.error("❌ Error in AI upload:", error);
    res.status(500).json({
      error: "Failed to process PDF upload",
      detail: error.message
    });
  }
});

// ✅ Get all bids (with optional filtering)
router.get("/", async (req, res) => {
  try {
    const { contractor, tender, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (contractor && contractor !== "undefined") filter.contractor = contractor;
    if (tender) filter.tender = tender;
    if (status) filter.status = status;

    const bids = await Bid.find(filter)
      .sort({ submissionDate: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate("tender", "contractor originalFilename");

    const total = await Bid.countDocuments(filter);

    res.json({
      bids,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("❌ Error fetching bids:", error);
    res.status(500).json({ error: "Failed to fetch bids", detail: error.message });
  }
});

// ✅ Get bid by ID
router.get("/:id", async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id).populate("tender");
    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }
    res.json(bid);
  } catch (error) {
    console.error("❌ Error fetching bid:", error);
    res.status(500).json({ error: "Failed to fetch bid", detail: error.message });
  }
});

// ✅ Create new bid
router.post("/", upload.array("documents", 10), async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = [
      'tenderId', 'contractor', 'bid_amount', 
      'project_duration', 'warranty_period'
    ];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missing: missingFields
      });
    }
    // Validate numeric fields
    if (isNaN(req.body.bid_amount) || isNaN(req.body.project_duration) || isNaN(req.body.warranty_period)) {
      return res.status(400).json({ error: "Numeric fields must contain valid numbers" });
    }
    console.log('🔍 Received bid submission request');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request files:', req.files);
    
    const { 
      tenderId, 
      contractor, 
      contractor_name,
      tenderTitle, 
      bid_amount, 
      project_duration, 
      warranty_period, 
      notes,
      project_success_rate,
      client_rating,
      rejection_history,
      safety_certification,
      license_category,
      contract_name
    } = req.body;
    
    const documents = req.files?.map(file => file.path) || [];
    
    console.log('🔍 Parsed data:', {
      tenderId,
      contractor,
      tenderTitle,
      bid_amount,
      project_duration,
      warranty_period,
      documents: documents.length
    });
    
    // Validate required fields
    if (!contractor || contractor === "undefined" || contractor === "test-user-id" || contractor.length !== 24) {
      return res.status(400).json({ 
        error: "Invalid contractor ID", 
        detail: `Contractor ID is required and must be a valid ObjectId. Received: ${contractor}` 
      });
    }
    
    if (!tenderId) {
      return res.status(400).json({ 
        error: "Invalid tender ID", 
        detail: "Tender ID is required" 
      });
    }

    const newBid = new Bid({
      tender: tenderId,
      contractor,
      tenderTitle,
      bidAmount: parseFloat(bid_amount),
      projectDuration: parseInt(project_duration),
      warranty: parseInt(warranty_period),
      notes,
      documents,
      project_success_rate: parseFloat(project_success_rate) || 0,
      client_rating: parseInt(client_rating) || 0,
      rejection_history: parseInt(rejection_history) || 0,
      safety_certification: safety_certification || "",
      license_category: license_category || "",
      contract_name: contract_name || "",
      status: "Under Review",
      submissionDate: new Date(),
    });

    console.log('🔍 Created bid object:', newBid);
    
    await newBid.save();
    console.log('✅ Bid saved to database');
    
    // Update tender bid count
    if (tenderId) {
      await Tender.findByIdAndUpdate(tenderId, { $inc: { bids: 1 } });
      console.log('✅ Updated tender bid count');
    }

    // Get tender details for notification
    const tender = await Tender.findById(tenderId);
    console.log('🔍 Found tender for notification:', tender);
    console.log('🔍 Tender homeownerId:', tender?.homeownerId);
    console.log('🔍 Tender title:', tender?.title);
    
    if (tender) {
      // Create notification data
      const notificationData = {
        type: 'new_bid',
        message: `New bid submitted by ${contractor_name || 'a contractor'} for tender "${tender.title || tender.contractor || 'Untitled'}"`,
        tender: tender._id,
        bid: newBid._id,
        tenderTitle: tender.title || tender.contractor || 'Untitled',
        contractorName: contractor_name || 'Unknown Contractor',
        bidAmount: newBid.bidAmount,
        contractorId: contractor,
      };

      // Save notification for homeowner
      if (tender.homeownerId) {
        console.log('✅ Tender has homeownerId, creating notification for:', tender.homeownerId);
        
        try {
          // Save notification to database
          const savedNotification = await Notification.create({
            userId: tender.homeownerId,
            userType: 'homeowner',
            ...notificationData
          });
          console.log('✅ Notification saved to database:', savedNotification._id);
          
          // Send real-time notification to homeowner via Pusher
          try {
            await sendNotificationToSpecificHomeowner(
              tender.homeownerId.toString(),
              EVENTS.NEW_BID,
              {
                ...notificationData,
                timestamp: new Date().toISOString()
              }
            );
            console.log('📢 Sent real-time notification to homeowner:', tender.homeownerId);
          } catch (pusherError) {
            console.error('❌ Pusher notification failed:', pusherError);
            console.log('⚠️ Database notification was saved, but real-time notification failed');
          }
        } catch (dbError) {
          console.error('❌ Error saving notification to database:', dbError);
        }
      } else {
        console.log('❌ Tender does not have homeownerId, cannot send notification');
        console.log('🔍 Tender data:', {
          _id: tender._id,
          title: tender.title,
          homeownerId: tender.homeownerId,
          homeownerName: tender.homeownerName
        });
      }

      // Save notification for contractor (if needed by your app)
      try {
        await Notification.create({
          ...notificationData
        });
      } catch (contractorNotificationError) {
        console.error('❌ Error saving contractor notification:', contractorNotificationError);
      }
    }

    res.status(201).json({ message: "Bid submitted successfully", bid: newBid });
  } catch (error) {
    console.error("❌ Error creating bid:", error);
    res.status(500).json({ error: "Failed to create bid", detail: error.message });
  }
});

// ✅ Update bid status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Under Review", "Accepted", "Rejected"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const bid = await Bid.findByIdAndUpdate(
      req.params.id,
      { status, lastUpdated: new Date() },
      { new: true }
    );

    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }

    // Get tender details for notification
    const tender = await Tender.findById(bid.tender);
    
    if (tender && bid.contractor) {
      // Create notification data
      const notificationData = {
        type: status === 'Accepted' ? 'bid_accepted' : 'bid_rejected',
        message: status === 'Accepted' 
          ? `Your bid for "${tender.title || tender.contractor || 'Untitled'}" has been accepted!`
          : `Your bid for "${tender.title || tender.contractor || 'Untitled'}" has been rejected.`,
        tender: tender._id,
        bid: bid._id,
        tenderTitle: tender.title || tender.contractor || 'Untitled',
        bidAmount: bid.bidAmount,
        status: status,
        timestamp: new Date().toISOString()
      };

      // Save notification for contractor
      try {
        await Notification.create({
          contractorId: bid.contractor,
          userType: 'contractor',
          ...notificationData
        });
        console.log('✅ Notification saved to database for contractor:', bid.contractor);
        
        // Send real-time notification to contractor via Pusher
        try {
          await sendNotificationToSpecificContractor(
            bid.contractor.toString(),
            status === 'Accepted' ? EVENTS.BID_ACCEPTED : EVENTS.BID_REJECTED,
            notificationData
          );
          console.log(`📢 Sent ${status} notification to contractor:`, bid.contractor);
        } catch (pusherError) {
          console.error('❌ Pusher notification failed:', pusherError);
          console.log('⚠️ Database notification was saved, but real-time notification failed');
        }
      } catch (dbError) {
        console.error('❌ Error saving contractor notification:', dbError);
      }

      // If bid is accepted, update tender status and contractor
      if (status === 'Accepted') {
        await Tender.findByIdAndUpdate(tender._id, {
          status: 'In Progress',
          contractor: bid.contractor,
          acceptedBid: bid._id
        });
        console.log('✅ Updated tender with accepted bid');
      }
    }

    res.json({ message: "Bid status updated", bid });
  } catch (error) {
    console.error("❌ Error updating bid status:", error);
    res.status(500).json({ error: "Failed to update bid status", detail: error.message });
  }
});

// ✅ Update bid
router.put("/:id", async (req, res) => {
  try {
    const bidData = {
      ...req.body,
      lastUpdated: new Date(),
    };

    const bid = await Bid.findByIdAndUpdate(req.params.id, bidData, { new: true });
    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }

    res.json({ message: "Bid updated successfully", bid });
  } catch (error) {
    console.error("❌ Error updating bid:", error);
    res.status(500).json({ error: "Failed to update bid", detail: error.message });
  }
});

// ✅ Delete bid
router.delete("/:id", async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ error: "Bid not found" });
    }

    // Delete associated documents
    if (bid.documents && bid.documents.length > 0) {
      bid.documents.forEach(docPath => {
        if (fs.existsSync(docPath)) {
          fs.unlinkSync(docPath);
        }
      });
    }

    await Bid.findByIdAndDelete(req.params.id);
    res.json({ message: "Bid deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting bid:", error);
    res.status(500).json({ error: "Failed to delete bid", detail: error.message });
  }
});

export default router;