import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import Tender from "../models/Tender.js";
import Bid from "../models/Bid.js";
import Contractor from "../models/Contractor.js";

const router = express.Router();

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
    cb(null, "ai-analysis-" + uniqueSuffix + path.extname(file.originalname));
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
// AI ANALYSIS FUNCTIONS
// =============================================================================

const runAIAnalysis = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py");
    execFile("python", [scriptPath, "analyze", pdfPath], (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error running AI analysis:", error);
        reject(new Error("Failed to run AI analysis"));
      } else if (stderr) {
        console.error("❌ AI analysis stderr:", stderr);
        reject(new Error(stderr));
              } else {
          try {
            // Extract JSON from mixed output (debug messages + JSON)
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
  });
};

const runMultiPDFAnalysis = (pdfPaths) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py");
    const args = ["analyze", ...pdfPaths];
    execFile("python", [scriptPath, ...args], (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error running multi-PDF analysis:", error);
        reject(new Error("Failed to run multi-PDF analysis"));
      } else if (stderr) {
        console.error("❌ Multi-PDF analysis stderr:", stderr);
        reject(new Error(stderr));
      } else {
        try {
          // Extract JSON from mixed output (debug messages + JSON)
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
            reject(new Error("No JSON found in multi-PDF analysis result"));
          }
        } catch (parseError) {
          console.error("❌ Error parsing multi-PDF analysis result:", parseError);
          console.error("❌ Raw stdout length:", stdout.length);
          console.error("❌ Raw stdout (first 500 chars):", stdout.substring(0, 500));
          reject(new Error("Failed to parse multi-PDF analysis result"));
        }
      }
    });
  });
};

// =============================================================================
// ROUTES
// =============================================================================

// ✅ Test route
router.get("/test", (req, res) => {
  res.json({ 
    message: "AI routes working!", 
    timestamp: new Date().toISOString(),
    features: [
      "Advanced PDF extraction",
      "AI-powered tender analysis", 
      "Multi-PDF comparison",
      "Winner prediction",
      "Feature importance analysis"
    ]
  });
});

// ✅ Analyze single PDF with AI
router.post("/analyze-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    console.log("🔍 Starting AI analysis for:", req.file.filename);

    const analysisResult = await runAIAnalysis(req.file.path);

    if (!analysisResult.success) {
      return res.status(500).json({
        error: "AI analysis failed",
        detail: analysisResult.error,
        traceback: analysisResult.traceback
      });
    }

    res.json({
      message: "AI analysis completed successfully",
      filename: req.file.filename,
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error in AI analysis:", error);
    res.status(500).json({ 
      error: "Failed to analyze PDF", 
      detail: error.message 
    });
  }
});

// ✅ Analyze multiple PDFs with AI comparison
router.post("/analyze-multiple", upload.array("pdfs", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No PDF files uploaded" });
    }

    console.log("🔍 Starting multi-PDF AI analysis for", req.files.length, "files");

    const pdfPaths = req.files.map(file => file.path);
    const analysisResult = await runMultiPDFAnalysis(pdfPaths);

    if (!analysisResult.success) {
      return res.status(500).json({
        error: "Multi-PDF AI analysis failed",
        detail: analysisResult.error,
        traceback: analysisResult.traceback
      });
    }

    res.json({
      message: "Multi-PDF AI analysis completed successfully",
      files: req.files.map(file => file.filename),
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error in multi-PDF AI analysis:", error);
    res.status(500).json({ 
      error: "Failed to analyze multiple PDFs", 
      detail: error.message 
    });
  }
});

// ✅ Analyze existing tender with AI
router.post("/analyze-tender/:tenderId", async (req, res) => {
  try {
    const { tenderId } = req.params;
    
    // Find the tender
    const tender = await Tender.findById(tenderId);
    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    // Check if tender has uploaded documents
    if (!tender.documents || tender.documents.length === 0) {
      return res.status(400).json({ 
        error: "No documents found for this tender",
        message: "Please upload PDF documents first"
      });
    }

    console.log("🔍 Starting AI analysis for tender:", tenderId);

    // Analyze each document
    const analysisResults = [];
    for (const document of tender.documents) {
      const documentPath = path.join(uploadsDir, document);
      
      if (fs.existsSync(documentPath)) {
        try {
          const analysisResult = await runAIAnalysis(documentPath);
          analysisResults.push({
            document: document,
            analysis: analysisResult
          });
        } catch (error) {
          console.error(`❌ Error analyzing document ${document}:`, error);
          analysisResults.push({
            document: document,
            error: error.message
          });
        }
      } else {
        analysisResults.push({
          document: document,
          error: "Document file not found"
        });
      }
    }

    res.json({
      message: "Tender AI analysis completed",
      tenderId: tenderId,
      tenderTitle: tender.title || tender.contractor,
      results: analysisResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error in tender AI analysis:", error);
    res.status(500).json({ 
      error: "Failed to analyze tender", 
      detail: error.message 
    });
  }
});

// ✅ Compare bids for a tender with AI
router.post("/compare-bids/:tenderId", async (req, res) => {
  try {
    const { tenderId } = req.params;
    
    // Find the tender
    const tender = await Tender.findById(tenderId);
    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    // Get all bids for this tender
    const bids = await Bid.find({ tender: tenderId }).populate("contractor");
    
    if (bids.length === 0) {
      return res.status(400).json({ 
        error: "No bids found for this tender",
        message: "Please submit bids first"
      });
    }

    console.log("🔍 Starting AI bid comparison for tender:", tenderId);

    // Collect PDF paths from bids
    const pdfPaths = [];
    const bidDocuments = [];
    
    for (const bid of bids) {
      if (bid.documents && bid.documents.length > 0) {
        for (const document of bid.documents) {
          const documentPath = path.join(uploadsDir, document);
          if (fs.existsSync(documentPath)) {
            pdfPaths.push(documentPath);
            bidDocuments.push({
              bidId: bid._id,
              contractor: bid.contractor,
              document: document
            });
          }
        }
      }
    }

    if (pdfPaths.length === 0) {
      return res.status(400).json({ 
        error: "No PDF documents found in bids",
        message: "Please ensure bids contain PDF documents"
      });
    }

    // Run AI analysis on all bid documents
    const analysisResult = await runMultiPDFAnalysis(pdfPaths);

    if (!analysisResult.success) {
      return res.status(500).json({
        error: "Bid comparison AI analysis failed",
        detail: analysisResult.error
      });
    }

    res.json({
      message: "Bid comparison AI analysis completed",
      tenderId: tenderId,
      tenderTitle: tender.title || tender.contractor,
      totalBids: bids.length,
      analyzedDocuments: pdfPaths.length,
      bidDocuments: bidDocuments,
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error in bid comparison AI analysis:", error);
    res.status(500).json({ 
      error: "Failed to compare bids", 
      detail: error.message 
    });
  }
});

// ✅ Get AI model information and status
router.get("/model-info", (req, res) => {
  res.json({
    message: "AI Model Information",
    model: "TenderPredictor XGBoost",
    features: [
      "Advanced PDF extraction with OCR",
      "Comprehensive data preprocessing",
      "XGBoost classification model",
      "Feature importance analysis",
      "Multi-PDF comparison",
      "Winner prediction with confidence scores"
    ],
    parameters: [
      "contract_name",
      "license_category", 
      "project_duration",
      "warranty_period",
      "client_rating",
      "project_success_rate",
      "rejection_history",
      "safety_certification",
      "bid_amount"
    ],
    capabilities: [
      "Extract tender data from PDF documents",
      "Analyze contractor qualifications",
      "Predict tender winners",
      "Compare multiple bids",
      "Generate detailed analysis reports"
    ],
    timestamp: new Date().toISOString()
  });
});

export default router; 