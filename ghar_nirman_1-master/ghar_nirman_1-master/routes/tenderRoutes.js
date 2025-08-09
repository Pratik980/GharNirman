import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import Tender from "../models/Tender.js";
import { sendNotificationToContractors, EVENTS } from '../config/pusher.js';
import Contractor from '../models/Contractor.js';
import Notification from '../models/Notification.js';

const router = express.Router();
// ...existing code...

router.post("/", async (req, res) => {
  try {
    const tenderData = {
      ...req.body,
      status: "open",
      bids: 0,
      lastUpdated: new Date(),
    };

    // Basic validation
    if (!tenderData.contractor) {
      return res.status(400).json({ error: "Contractor name is required" });
    }

    const newTender = new Tender(tenderData);
    await newTender.save();

    // Notify all verified contractors via Pusher and save persistent notification
    const contractors = await Contractor.find({ status: "verified" }).select("_id");
    for (const contractor of contractors) {
      // Save notification in DB
      await Notification.create({
        contractorId: contractor._id,
        message: `New tender "${newTender.title || newTender.contractor || 'Untitled'}" created by ${newTender.homeownerName || newTender.createdBy || 'a homeowner'}`,
        tender: newTender._id,
        tenderTitle: newTender.title || newTender.contractor || 'Untitled',
        homeownerName: newTender.homeownerName || newTender.createdBy || 'Unknown',
      });
    }

    // Send notification to all contractors via Pusher
    await sendNotificationToContractors(EVENTS.NEW_TENDER, {
      type: 'new-tender',
      message: `New tender "${newTender.title || newTender.contractor || 'Untitled'}" created by ${newTender.homeownerName || newTender.createdBy || 'a homeowner'}`,
      tender: {
        id: newTender._id,
        title: newTender.title || newTender.contractor || 'Untitled',
        homeownerName: newTender.homeownerName || newTender.createdBy || 'Unknown',
        status: newTender.status,
        createdAt: newTender.createdAt,
        lastUpdated: newTender.lastUpdated
      },
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ message: "Tender created successfully", tender: newTender });
  } catch (error) {
    console.error("❌ Error creating tender:", error);
    res.status(500).json({ error: "Failed to create tender", detail: error.message });
  }
});
// ...existing code...

// =============================================================================
// MULTER SETUP (For PDF Uploads)
// =============================================================================

const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "tender-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// =============================================================================
// PDF TEXT EXTRACTION USING PYTHON (pdfplumber)
// =============================================================================

const extractTextFromPDF = (pdfPath) => {
  return new Promise((resolve, reject) => {
    // Try multiple possible paths for the Python script
    const possiblePaths = [
      path.join(process.cwd(), "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py"),
      path.join(process.cwd(), "..", "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py"),
      path.join(__dirname, "..", "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py"),
      path.join(__dirname, "..", "..", "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py")
    ];
    
    let scriptPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        scriptPath = testPath;
        break;
      }
    }
    
    if (!scriptPath) {
      console.error("❌ Could not find Python script at any of these paths:");
      possiblePaths.forEach(p => console.error("   ", p));
      reject(new Error("Python script not found"));
      return;
    }
    
    console.log("🔍 Using script path:", scriptPath);
    
    const child = execFile("python", [scriptPath, "analyze", pdfPath], (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error running Python script:", error);
        reject(new Error("Failed to extract text using Python"));
      } else {
        // Handle stderr as debug output (not error)
        if (stderr) {
          console.log("📝 Fallback debug output:", stderr);
        }
        
        // Try to extract JSON from the output
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[0]);
            if (result.success && result.data) {
              // Return the extracted data as text for compatibility
              resolve(JSON.stringify(result.data));
            } else {
              resolve(stdout);
            }
          } catch (parseError) {
            resolve(stdout);
          }
        } else {
          resolve(stdout);
        }
      }
    });
    
    // Set timeout for fallback function (120 seconds for full page processing)
    setTimeout(() => {
      child.kill();
      reject(new Error("Python script timeout after 120 seconds"));
    }, 120000);
  });
};

const extractTenderDataFromText = (text) => {
  const patterns = {
    contract_name: /(?:Contractor|Company|Firm|Contract Name):\s*([^\n\r]+)/i,
    license_category: /(?:License Category|License Type|Category):\s*([^\n\r]+)/i,
    project_duration: /(?:Project Duration|Duration|Timeline):\s*(\d+)/i,
    warranty_period: /(?:Warranty|Warranty Period):\s*(\d+)/i,
    client_rating: /(?:Client Rating|Rating|Score):\s*(\d+)/i,
    project_success_rate: /(?:Success Rate|Completion Rate|Project Success Rate):\s*([\d\.]+)/i,
    rejection_history: /(?:Rejection History|Rejections):\s*(\d+)/i,
    safety_certification: /(?:Safety Certification|Safety Cert|Certification):\s*([^\n\r]+)/i,
    bid_amount: /(?:Bid Amount|Amount|Price|Cost):\s*[$]?\s*([\d,\.]+)/i,
  };

  const extractedData = {};

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      switch (key) {
        case "bid_amount":
          extractedData[key] = parseFloat(match[1].replace(/,/g, "")) || 0;
          break;
        case "project_duration":
        case "warranty_period":
        case "client_rating":
        case "rejection_history":
          extractedData[key] = parseInt(match[1]) || 0;
          break;
        case "project_success_rate":
          extractedData[key] = parseFloat(match[1]) || 0;
          break;
        case "safety_certification":
          extractedData[key] = match[1].trim();
          break;
        default:
          extractedData[key] = match[1].trim();
      }
    } else {
      switch (key) {
        case "bid_amount":
        case "project_duration":
        case "warranty_period":
        case "client_rating":
        case "rejection_history":
        case "project_success_rate":
          extractedData[key] = 0;
          break;
        case "safety_certification":
          extractedData[key] = "";
          break;
        default:
          extractedData[key] = "";
      }
    }
  }

  return extractedData;
};

// =============================================================================
// ROUTES
// =============================================================================

// ✅ Test route
router.get("/test", (req, res) => {
  res.json({ message: "Tender routes working!", timestamp: new Date().toISOString() });
});

// ✅ Debug route to check all tenders and their homeownerId values
router.get("/debug/homeownerIds", async (req, res) => {
  try {
    const tenders = await Tender.find({}).select('_id title homeownerId homeownerName createdAt');
    console.log('🔍 All tenders with homeownerId:', tenders);
    res.json({
      message: "Debug: All tenders with homeownerId",
      count: tenders.length,
      tenders: tenders
    });
  } catch (error) {
    console.error("❌ Error fetching tenders for debug:", error);
    res.status(500).json({ error: "Failed to fetch tenders", detail: error.message });
  }
});

// ✅ Simple test route for debugging
router.get("/debug", async (req, res) => {
  try {
    const tenderCount = await Tender.countDocuments();
    res.json({ 
      message: "Tender routes working!", 
      tenderCount,
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Database error", 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Create tender manually (for contractor bidding management)
router.post("/", async (req, res) => {
  try {
    const tenderData = {
      ...req.body,
      status: "open",
      bids: 0,
      lastUpdated: new Date(),
    };

    // Basic validation
    if (!tenderData.contractor) {
      return res.status(400).json({ error: "Contractor name is required" });
    }

    const newTender = new Tender(tenderData);
    await newTender.save();

    // Notify all verified contractors via persistent notification
    const contractors = await Contractor.find({ status: "verified" }).select("_id");
    for (const contractor of contractors) {
      // Save notification in DB
      await Notification.create({
        contractorId: contractor._id,
        message: `New tender "${newTender.title || newTender.contractor || 'Untitled'}" created by ${newTender.homeownerName || newTender.createdBy || 'a homeowner'}`,
        tender: newTender._id,
        tenderTitle: newTender.title || newTender.contractor || 'Untitled',
        homeownerName: newTender.homeownerName || newTender.createdBy || 'Unknown',
      });
    }

    res.status(201).json({ message: "Tender created manually", tender: newTender });
  } catch (error) {
    console.error("❌ Error creating tender:", error);
    res.status(500).json({ error: "Failed to create tender", detail: error.message });
  }
});

// ✅ Create homeowner tender (for tender creation form)
router.post("/homeowner", async (req, res) => {
  try {
    console.log("📝 Received tender creation request:", req.body);
    
    const tenderData = {
      title: req.body.title,
      description: req.body.description,
      budget: req.body.budget,
      location: req.body.location,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      licenseCategory: req.body.licenseCategory,
      projectType: req.body.projectType,
      siteVisit: req.body.siteVisit,
      warranty: req.body.warranty,
      materials: req.body.materials,
      safetyCert: req.body.safetyCert,
      deadline: req.body.deadline,
      visibility: req.body.visibility,
      notes: req.body.notes,
      homeownerId: req.body.homeownerId,
      homeownerName: req.body.homeownerName,
      status: "open",
      bids: 0,
      lastUpdated: new Date(),
    };
    
    console.log("📝 Processed tender data:", tenderData);

    // Basic validation
    if (!tenderData.title || !tenderData.description || !tenderData.location) {
      return res.status(400).json({ error: "Title, description, and location are required" });
    }

    const newTender = new Tender(tenderData);
    await newTender.save();

    // Notify all verified contractors via persistent notification
    try {
      const contractors = await Contractor.find({ status: "verified" }).select("_id");
      console.log(`📢 Found ${contractors.length} verified contractors to notify`);
      
      for (const contractor of contractors) {
        // Save notification in DB
        await Notification.create({
          contractorId: contractor._id,
          message: `New tender "${newTender.title}" created by ${newTender.homeownerName || 'a homeowner'}`,
          tender: newTender._id,
          tenderTitle: newTender.title,
          homeownerName: newTender.homeownerName || 'Unknown',
        });
      }
    } catch (notificationError) {
      console.error("❌ Error creating notifications:", notificationError);
      // Don't fail the tender creation if notifications fail
    }

    res.status(201).json({ 
      message: "Homeowner tender created successfully", 
      tender: newTender,
      success: true
    });
  } catch (error) {
    console.error("❌ Error creating homeowner tender:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ error: "Failed to create homeowner tender", detail: error.message });
  }
});

// ✅ Update tender
router.put("/:id", async (req, res) => {
  try {
    const tenderData = {
      ...req.body,
      lastUpdated: new Date(),
    };

    // Validate status if provided
    if (tenderData.status) {
      const validStatuses = ["open", "closed", "awarded", "cancelled"];
      if (!validStatuses.includes(tenderData.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
    }

    const tender = await Tender.findByIdAndUpdate(req.params.id, tenderData, { new: true });
    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json({ message: "Tender updated successfully", tender });
  } catch (error) {
    console.error("❌ Error updating tender:", error);
    res.status(500).json({ error: "Failed to update tender", detail: error.message });
  }
});

// ✅ Upload PDF and auto-extract data with AI
router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    console.log("🔍 Processing PDF with AI:", req.file.filename);

    // Use the new AI extraction with run_tender_predictor.py
    const scriptPath = path.join(process.cwd(), "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py");
    console.log("🔍 Main script path:", scriptPath);
    console.log("🔍 Main file exists:", fs.existsSync(scriptPath));
    const { execFile } = await import("child_process");
    
    const aiAnalysisResult = await new Promise((resolve, reject) => {
      const child = execFile("python", [scriptPath, "analyze", req.file.path], (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Error running AI analysis:", error);
          console.error("❌ Command that failed:", `python ${scriptPath} analyze ${req.file.path}`);
          reject(new Error("Failed to run AI analysis"));
        } else {
          // Handle stderr as debug output (not error)
          if (stderr) {
            console.log("📝 AI analysis debug output:", stderr);
          }
          try {
            // Extract JSON from mixed output (debug messages + JSON)
            console.log('🟡 Raw AI stdout:', stdout);
            // Try multiple patterns to find JSON
            let jsonMatch = null;
            
            // Pattern 1: Look for JSON object at the end
            const endJsonMatch = stdout.match(/\{[\s\S]*\}$/);
            if (endJsonMatch) {
              jsonMatch = endJsonMatch[0];
            } else {
              // Pattern 2: Look for any JSON object
              const anyJsonMatch = stdout.match(/\{[\s\S]*\}/);
              if (anyJsonMatch) {
                jsonMatch = anyJsonMatch[0];
              }
            }
            
            if (jsonMatch) {
              console.log("🔍 Found JSON in output, length:", jsonMatch.length);
              const result = JSON.parse(jsonMatch);
              resolve(result);
            } else {
              console.error("❌ No JSON found in output");
              console.error("❌ Raw stdout length:", stdout.length);
              console.error("❌ Raw stdout (first 500 chars):", stdout.substring(0, 500));
              reject(new Error("No JSON found in AI analysis result"));
            }
          } catch (parseError) {
            console.error("❌ Error parsing AI analysis result:", parseError);
            console.error("❌ Raw stdout length:", stdout.length);
            console.error("❌ Raw stdout (first 500 chars):", stdout.substring(0, 500));
            reject(new Error("Failed to parse AI analysis result"));
          }
        }
      });
      
              // Set timeout to prevent hanging (increased to 120 seconds for full page processing)
        setTimeout(() => {
          child.kill();
          reject(new Error("Python script timeout after 120 seconds"));
        }, 120000);
    });

    let extractedData = {};
    let aiAnalysis = null;

    try {
      if (aiAnalysisResult.success) {
        extractedData = aiAnalysisResult.data;
        aiAnalysis = aiAnalysisResult;
        console.log("✅ AI analysis successful for:", req.file.filename);
      } else {
        console.log("⚠️ AI analysis failed, falling back to basic extraction for:", req.file.filename);
        // Fallback to basic extraction
        const extractedText = await extractTextFromPDF(req.file.path);
        extractedData = extractTenderDataFromText(extractedText);
      }
    } catch (aiError) {
      console.error("❌ AI analysis error, falling back to basic extraction:", aiError);
      // Fallback to basic extraction
      const extractedText = await extractTextFromPDF(req.file.path);
      extractedData = extractTenderDataFromText(extractedText);
    }

    // Map AI extracted data to database schema fields
    const mappedData = {
      contractor: extractedData.contractor_name || extractedData.contract_name || extractedData.contractor,
      licenseCategory: extractedData.license_category,
      bidAmount: extractedData.bid_amount || 0,
      projectDuration: extractedData.project_duration || 0,
      warranty: extractedData.warranty_period || 0,
      experience: extractedData.experience || 5, // Default experience
      successRate: extractedData.project_success_rate || 0,
      clientRating: extractedData.client_rating || 0,
      rejectionHistory: extractedData.rejection_history || 0,
      safetyCertification: extractedData.safety_certification || "No",
      materialSourceCertainty: extractedData.material_source_certainty || 50, // Default 50%
      documentsPath: req.file.path,
      originalFilename: req.file.originalname,
      extractedText: aiAnalysis ? "AI-extracted data" : extractedText,
      status: "open",
      bids: 0,
      lastUpdated: new Date(),
    };

    console.log("📊 Mapped data for database:", mappedData);
    console.log("🟢 Final mappedData before DB save:", mappedData);
    const newTender = new Tender(mappedData);

    await newTender.save();
    res.status(201).json({
      message: aiAnalysis ? "PDF uploaded and AI analysis completed successfully" : "PDF uploaded and data extracted successfully",
      tender: newTender,
      aiAnalysis: aiAnalysis,
      extractedData: extractedData,
      mappedData: mappedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error processing PDF:", error);
    // Try to clean up the uploaded file, but don't fail if it's locked
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log("✅ Uploaded file cleaned up successfully");
      } catch (cleanupError) {
        console.warn("⚠️ Could not delete uploaded file (may be in use):", cleanupError.message);
      }
    }
    res.status(500).json({ error: "Failed to process PDF", detail: error.message });
  }
});

// ✅ Get list of uploaded files
router.get("/upload/files", async (req, res) => {
  try {
    const tenders = await Tender.find({ documentsPath: { $exists: true, $ne: null } })
      .select("contractor originalFilename documentsPath lastUpdated")
      .sort({ lastUpdated: -1 });

    const files = tenders.map((tender) => ({
      filename: tender.originalFilename || path.basename(tender.documentsPath),
      uploadDate: tender.lastUpdated,
      contractor: tender.contractor,
      path: tender.documentsPath,
      id: tender._id,
    }));

    res.json(files);
  } catch (error) {
    console.error("❌ Error fetching uploaded files:", error);
    res.status(500).json({ error: "Failed to fetch uploaded files", detail: error.message });
  }
});

// ✅ Analyze bids with ML
router.post("/analyze", async (req, res) => {
  try {
    const bids = req.body;
    if (!Array.isArray(bids) || bids.length === 0) {
      return res.status(400).json({ error: "No bids data provided" });
    }

    const rankings = bids.map((bid, idx) => {
      const bidAmount = bid.bidAmount || 0;
      const experience = bid.experience || 0;
      const successRate = bid.successRate || 0;
      const clientRating = bid.clientRating || 0;
      const rejectionHistory = bid.rejectionHistory || 0;
      const materialSourceCertainty = bid.materialSourceCertainty || 0;

      const priceScore = bidAmount > 0 ? Math.max(0, 100 - bidAmount / 10000) : 0;
      const experienceScore = Math.min(experience * 5, 50);
      const successScore = successRate;
      const ratingScore = clientRating;
      const rejectionPenalty = rejectionHistory * 5;
      const materialScore = materialSourceCertainty * 0.5;

      const compositeScore = Math.max(
        0,
        priceScore * 0.25 +
          experienceScore * 0.2 +
          successScore * 0.2 +
          ratingScore * 0.15 +
          materialScore * 0.1 +
          (100 - rejectionPenalty) * 0.1
      );

      return {
        contractor: bid.contractor || `Contractor ${idx + 1}`,
        composite_score: Math.round(compositeScore * 100) / 100,
        win_probability: Math.min(Math.round((compositeScore / 100) * 10000) / 100, 100),
        bid_amount: bidAmount,
        technical_merit: Math.round((experienceScore + successScore + ratingScore + materialScore) / 3.7 * 10) / 10,
        material_score: materialScore,
      };
    });

    rankings.sort((a, b) => b.composite_score - a.composite_score);
    res.json(rankings);
  } catch (error) {
    console.error("❌ Error analyzing bids:", error);
    res.status(500).json({ error: "Failed to analyze bids", detail: error.message });
  }
});

// ✅ Get all tenders with pagination and field selection
router.get("/", async (req, res) => {
  try {
    const { status, contractor, page = 1, limit = 10, select } = req.query;
    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (contractor) filter.contractor = new RegExp(contractor, "i");

    let query = Tender.find(filter).sort({ lastUpdated: -1 });
    if (select) {
      query = query.select(select);
    } else {
      query = query.select(
        "title description budget location startDate endDate deadline visibility notes homeownerId homeownerName projectType siteVisit materials safetyCert contractor licenseCategory bidAmount projectDuration warranty experience successRate clientRating rejectionHistory safetyCertification materialSourceCertainty documentsPath originalFilename extractedText status bids lastUpdated"
      );
    }

    const tenders = await query
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Tender.countDocuments(filter);

    res.json({
      tenders,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("❌ Error fetching tenders:", error);
    res.status(500).json({ error: "Failed to fetch tenders", detail: error.message });
  }
});

// ✅ Get tender by ID
router.get("/:id", async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }
    res.json(tender);
  } catch (error) {
    console.error("❌ Error fetching tender:", error);
    res.status(500).json({ error: "Failed to fetch tender", detail: error.message });
  }
});

// ✅ Get tender extracted text
router.get("/:id/text", async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id).select("contractor originalFilename extractedText");
    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json({
      extractedText: tender.extractedText || "No extracted text available",
      contractor: tender.contractor,
      originalFilename: tender.originalFilename,
    });
  } catch (error) {
    console.error("❌ Error fetching tender text:", error);
    res.status(500).json({ error: "Failed to fetch tender text", detail: error.message });
  }
});

// ✅ Update tender status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["open", "closed", "awarded", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const tender = await Tender.findByIdAndUpdate(
      req.params.id,
      { status, lastUpdated: new Date() },
      { new: true }
    );

    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json({ message: "Tender status updated", tender });
  } catch (error) {
    console.error("❌ Error updating tender status:", error);
    res.status(500).json({ error: "Failed to update tender status", detail: error.message });
  }
});

// ✅ Delete tender
router.delete("/:id", async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (tender.documentsPath && fs.existsSync(tender.documentsPath)) {
      fs.unlinkSync(tender.documentsPath);
    }

    await Tender.findByIdAndDelete(req.params.id);
    res.json({ message: "Tender deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting tender:", error);
    res.status(500).json({ error: "Failed to delete tender", detail: error.message });
  }
});

// ✅ Bulk upload multiple PDFs
router.post("/upload/bulk", upload.array("pdfs", 10), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No PDF files uploaded" });
    }

    const results = [];
    const errors = [];

    await Promise.all(
      req.files.map(async (file) => {
        try {
          const extractedText = await extractTextFromPDF(file.path);
          const extractedData = extractTenderDataFromText(extractedText);

          const newTender = new Tender({
            ...extractedData,
            documentsPath: file.path,
            originalFilename: file.originalname,
            extractedText,
            status: "open",
            bids: 0,
            lastUpdated: new Date(),
          });

          await newTender.save();
          results.push({
            filename: file.originalname,
            tender: newTender,
            success: true,
          });
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message,
          });
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
      })
    );

    res.status(201).json({
      message: `Processed ${results.length} files, ${errors.length} failed`,
      results,
      errors,
    });
  } catch (error) {
    console.error("❌ Error in bulk upload:", error);
    res.status(500).json({ error: "Failed to process bulk upload", detail: error.message });
  }
});

export default router;