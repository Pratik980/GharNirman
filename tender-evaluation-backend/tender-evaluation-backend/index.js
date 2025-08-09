import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dbConnect from "./dbconnection.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import tenderRoutes from "./routes/tenderRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import contractorRoutes from "./routes/contractorRoutes.js";
import homeownerRoutes from "./routes/homeownerRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notificationRoutes from './routes/notificationRoutes.js';
import { pusher } from "./config/pusher.js";

console.log("=== Backend index.js is running ===");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS middleware configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  })
);

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Additional middleware for parsing form data (for Pusher auth)
app.use(express.urlencoded({ extended: false }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory");
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Base route for quick API check
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Welcome to the Tender Evaluation API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      contact: "/api/contact", 
      tenders: "/api/tenders",
      contractors: "/api/contractors",
      homeowner: "/api/homeowner",
      bids: "/api/bids", // <-- keep this if you use bids
      ai: "/api/ai",
      uploads: "/uploads",
      health: "/health"
    }
  });
});

// Optional: test route for contractor API
app.get("/test-contractor", (req, res) => {
  res.json({ 
    message: "Contractor API is working!",
    timestamp: new Date().toISOString(),
    testData: {
      fullName: "Test Contractor",
      email: "test@example.com",
      companyName: "Test Company"
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Route handlers
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/homeowner", homeownerRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/notifications', notificationRoutes);

// Pusher authentication endpoint for private channels
app.post('/pusher/auth', (req, res) => {
  console.log('🔐 Pusher auth request received');
  console.log('🔐 Request headers:', req.headers);
  console.log('🔐 Request body:', req.body);
  console.log('🔐 Content-Type:', req.headers['content-type']);
  
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  
  console.log('🔐 Pusher auth request:', { socketId, channel });
  
  // Validate required parameters
  if (!socketId || !channel) {
    console.log('❌ Invalid Pusher auth request - missing socket_id or channel_name');
    return res.status(400).json({
      error: 'Invalid request',
      message: 'socket_id and channel_name are required'
    });
  }
  
  // Only authorize private channels
  if (!channel.startsWith('private-')) {
    console.log('❌ Attempted to authorize non-private channel:', channel);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only private channels can be authorized'
    });
  }
  
  // For now, authorize all private channels (you can add authentication logic here)
  const authResponse = pusher.authorizeChannel(socketId, channel);
  console.log('✅ Pusher auth successful for channel:', channel);
  res.send(authResponse);
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
          availableRoutes: ["/api/auth", "/api/contact", "/api/tenders", "/api/bids", "/api/contractors", "/api/homeowner", "/api/ai"]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("❌ Global Error:", error);
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server after DB connection
const startServer = async () => {
  try {
    // Connect to database
    await dbConnect();
    console.log("✅ MongoDB connected successfully");

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
      console.log(`📁 Static files served from: /uploads`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
};

// Start the application
startServer();

// Graceful shutdown to free port 5000
process.on('SIGINT', () => {
  console.log('🛑 Server closed gracefully (SIGINT)');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('🛑 Server closed gracefully (SIGTERM)');
  process.exit(0);
});