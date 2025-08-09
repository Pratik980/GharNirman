# Backend Components Overview

## 🏗️ Backend Architecture Components & Usage

### 1. **Node.js & Express.js Framework**
**Location**: `tender-evaluation-backend/tender-evaluation-backend/index.js`

**Usage**:
- **Main Server**: Express.js application server running on port 5000
- **Middleware Setup**: CORS, JSON parsing, URL encoding, static file serving
- **Route Organization**: Modular routing with separate route files
- **Error Handling**: Global error handlers and graceful shutdown

**Key Features**:
```javascript
// Main Express app setup
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for frontend communication
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));

// Static file serving for uploads
app.use('/uploads', express.static(uploadsDir));
```

### 2. **File Upload & Storage (Multer)**
**Location**: Multiple route files using Multer middleware

**Primary Usage**:
- **AI Routes**: `tender-evaluation-backend/tender-evaluation-backend/routes/aiRoutes.js`
- **Tender Routes**: `tender-evaluation-backend/tender-evaluation-backend/routes/tenderRoutes.js`
- **Bid Routes**: `tender-evaluation-backend/tender-evaluation-backend/routes/bidRoutes.js`

**Configuration**:
```javascript
// Multer setup for PDF uploads
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
```

**File Storage Structure**:
```
uploads/
├── tender-*.pdf          # Tender documents
├── bid-doc-*.pdf         # Bid documents  
├── ai-analysis-*.pdf     # AI analysis files
└── contractors/          # Contractor-specific uploads
```

### 3. **Database & Storage (MongoDB)**
**Location**: `tender-evaluation-backend/tender-evaluation-backend/dbconnection.js`

**Connection Setup**:
```javascript
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tender_evaluation";

const dbConnect = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB Connected Successfully...");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
  }
};
```

**Database Models**:
- **Tender Model**: `models/Tender.js` - Stores tender information, documents, and metadata
- **Bid Model**: `models/Bid.js` - Stores contractor bids and evaluations
- **Contractor Model**: `models/contractor.js` - Stores contractor profiles and verification
- **User Model**: `models/User.js` - User authentication and profiles
- **Notification Model**: `models/Notification.js` - Real-time notifications

**Key Collections**:
```javascript
// Tender Schema includes:
- title, description, budget, location
- documentsPath, originalFilename, extractedText
- status, bids, lastUpdated
- AI analysis results and metadata

// Bid Schema includes:
- contractorId, tenderId, bidAmount
- projectDuration, warranty, experience
- safetyCertification, materialSourceCertainty
```

### 4. **AI/ML Integration (Node.js Child Processes)**
**Location**: `tender-evaluation-backend/tender-evaluation-backend/routes/aiRoutes.js`

**Python Script Execution**:
```javascript
const runAIAnalysis = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "..", "..", "ghar_nirman_1-master", "ghar_nirman_1-master", "HamroAi", "run_tender_predictor.py");
    execFile("python", [scriptPath, "analyze", pdfPath], (error, stdout, stderr) => {
      // Process AI analysis results
    });
  });
};
```

**AI Integration Points**:
- **Single PDF Analysis**: `/api/ai/analyze-pdf` - Analyzes individual tender documents
- **Multi-PDF Comparison**: `/api/ai/analyze-multiple` - Compares multiple bids
- **Winner Prediction**: AI predicts winning contractor based on multiple factors
- **Feature Importance**: Analyzes which factors most influence tender success

**Python AI Components**:
- **Location**: `ghar_nirman_1-master/ghar_nirman_1-master/HamroAi/`
- **Main Script**: `run_tender_predictor.py` - Executed by Node.js backend
- **Test Script**: `test_predictor.py` - Testing AI functionality
- **Model**: `tender_predictor.py` - Core AI prediction logic

### 5. **File System Storage Organization**

**Upload Directory Structure**:
```
tender-evaluation-backend/tender-evaluation-backend/uploads/
├── tender-*.pdf              # Tender documents (3.8MB each)
├── bid-doc-*.pdf             # Bid documents (3.8MB each)  
├── ai-analysis-*.pdf         # AI processed files
├── contractors/              # Contractor-specific uploads
└── *.txt                     # Extracted text files (220B each)
```

**File Management Features**:
- **Automatic Directory Creation**: Creates uploads directory if missing
- **Unique Naming**: Timestamp + random suffix for file uniqueness
- **Type Validation**: Only PDF files allowed for analysis
- **Size Limits**: 10MB maximum file size
- **Static Serving**: Files served via `/uploads` endpoint

### 6. **API Endpoints & Routes**

**Main Route Categories**:
```javascript
// Authentication & Users
app.use("/api/auth", authRoutes);

// Contact & Communication  
app.use("/api/contact", contactRoutes);

// Tender Management
app.use("/api/tenders", tenderRoutes);

// Bid Processing
app.use("/api/bids", bidRoutes);

// Contractor Management
app.use("/api/contractors", contractorRoutes);

// Homeowner Features
app.use("/api/homeowner", homeownerRoutes);

// AI Analysis
app.use("/api/ai", aiRoutes);

// Real-time Notifications
app.use('/api/notifications', notificationRoutes);
```

### 7. **Real-time Features (Pusher Integration)**

**Location**: `tender-evaluation-backend/tender-evaluation-backend/config/pusher.js`

**Usage**:
- **Contractor Notifications**: Real-time tender notifications
- **Bid Updates**: Live bid status updates
- **Authentication**: Private channel authorization
- **Event Broadcasting**: System-wide event notifications

### 8. **Dependencies & Package Management**

**Key Dependencies** (from `package.json`):
```json
{
  "express": "^4.21.2",           // Web framework
  "mongoose": "^7.6.0",           // MongoDB ODM
  "multer": "^2.0.1",             // File upload middleware
  "cors": "^2.8.5",               // Cross-origin resource sharing
  "pusher": "^5.2.0",             // Real-time notifications
  "bcryptjs": "^3.0.2",           // Password hashing
  "jsonwebtoken": "^9.0.2",       // JWT authentication
  "pdf-parse": "^1.1.1",          // PDF text extraction
  "stripe": "^18.3.0"             // Payment processing
}
```

## 🔄 Data Flow Overview

1. **File Upload**: PDFs uploaded via Multer → Stored in `uploads/` directory
2. **Database Storage**: File metadata stored in MongoDB collections
3. **AI Processing**: Node.js executes Python scripts for analysis
4. **Results Storage**: AI results stored back in database
5. **Real-time Updates**: Results broadcast via Pusher to frontend
6. **Static Serving**: Files served via Express static middleware

## 🛠️ Development & Deployment

**Environment Setup**:
- **Development**: `npm run dev` (nodemon)
- **Production**: `npm start` (node)
- **Port**: 5000 (configurable via PORT env var)
- **Database**: MongoDB (configurable via MONGO_URI env var)

**File Organization**:
- **Routes**: Modular route files in `/routes/`
- **Models**: Mongoose schemas in `/models/`
- **Middleware**: Custom middleware in `/middleware/`
- **Config**: Configuration files in `/config/`
- **Uploads**: File storage in `/uploads/`

This architecture provides a robust, scalable backend system for tender evaluation with AI-powered analysis, real-time notifications, and comprehensive file management. 