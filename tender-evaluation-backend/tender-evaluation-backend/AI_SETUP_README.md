# 🤖 AI Integration Setup Guide

## Overview
This backend now integrates with your advanced AI tender prediction model (`tender_predictor.py`) for intelligent PDF analysis and tender data extraction.

## 🚀 Quick Start

### 1. Start the Backend
```bash
cd tender-evaluation-backend/tender-evaluation-backend
npm install
npm start
```

### 2. Test the AI Integration
```bash
node test_ai_integration.js
```

### 3. Upload a PDF via Frontend
- Go to your React frontend
- Upload a PDF tender document
- The backend will automatically call your AI model for analysis

## 📁 File Structure
```
tender-evaluation-backend/tender-evaluation-backend/
├── routes/
│   └── tenderRoutes.js          # Updated with AI integration
├── test_ai_integration.js       # Test script
├── package.json                 # Has start script
└── AI_SETUP_README.md          # This file

ghar_nirman_1-master/ghar_nirman_1-master/HamroAi/
├── tender_predictor.py          # Your AI model
└── run_tender_predictor.py      # CLI wrapper (NEW)
```

## 🔧 How It Works

### 1. Frontend Upload
- User uploads PDF via React frontend
- Request goes to `POST /api/tenders/upload`

### 2. Backend Processing
- Backend saves PDF to `uploads/` directory
- Calls `run_tender_predictor.py` with PDF path
- Python script calls your `tender_predictor.py` AI model

### 3. AI Analysis
- Your AI model extracts data from PDF
- Returns structured JSON with tender parameters
- Backend saves results to database

### 4. Response
- Frontend receives extracted data
- Can display AI analysis results

## 📊 Expected Response Format
```json
{
  "success": true,
  "data": {
    "contract_name": "ABC Construction",
    "license_category": "A",
    "project_duration": 18,
    "warranty_period": 24,
    "client_rating": 4,
    "project_success_rate": 85.5,
    "rejection_history": 1,
    "safety_certification": "Yes",
    "bid_amount": 150000.0
  }
}
```

## 🛠️ Troubleshooting

### Error: "Python script not found"
- Check that `run_tender_predictor.py` exists in the correct path
- Verify the path in `tenderRoutes.js` line ~250

### Error: "ImportError: No module named tender_predictor"
- Make sure `tender_predictor.py` is in the same directory as `run_tender_predictor.py`
- Check Python dependencies are installed

### Error: "No JSON found in output"
- The Python script might be printing debug messages
- Check that `run_tender_predictor.py` only outputs JSON to stdout

### Backend not starting
- Make sure you're in the correct directory: `tender-evaluation-backend/tender-evaluation-backend`
- Run `npm install` first
- Check that `package.json` has `"start": "node index.js"`

## 🧪 Testing

### Test AI Integration
```bash
node test_ai_integration.js
```

### Test Backend API
```bash
curl http://localhost:5000/api/tenders/test
```

### Test Upload Endpoint
```bash
curl -X POST -F "pdf=@test.pdf" http://localhost:5000/api/tenders/upload
```

## 📝 API Endpoints

- `POST /api/tenders/upload` - Upload PDF and get AI analysis
- `GET /api/tenders/` - Get all tenders
- `GET /api/tenders/:id` - Get specific tender
- `POST /api/tenders/analyze` - Analyze bids with ML

## 🔄 Next Steps

1. **Start the backend**: `npm start`
2. **Test the integration**: `node test_ai_integration.js`
3. **Upload a PDF** from your frontend
4. **Check the results** in the database

## 📞 Support

If you encounter issues:
1. Check the backend console for error messages
2. Run the test script to isolate AI issues
3. Verify all file paths are correct
4. Ensure Python dependencies are installed 