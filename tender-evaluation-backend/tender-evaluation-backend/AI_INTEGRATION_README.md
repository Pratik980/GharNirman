# AI/ML Integration for Tender Evaluation Backend

## Overview

This backend now includes advanced AI/ML capabilities for tender analysis and prediction, powered by the `TenderPredictor` system. The integration provides comprehensive PDF extraction, data analysis, and winner prediction using XGBoost machine learning models.

## 🚀 Features

### Advanced PDF Processing
- **OCR Integration**: Uses Tesseract for text extraction from images in PDFs
- **Smart Data Extraction**: Extracts tender data using advanced pattern recognition
- **Multi-page Analysis**: Handles complex multi-page tender documents
- **Fallback System**: Falls back to basic extraction if AI analysis fails

### AI/ML Capabilities
- **XGBoost Model**: Advanced classification for tender winner prediction
- **Feature Engineering**: Creates sophisticated features from raw data
- **Multi-PDF Comparison**: Analyzes and compares multiple tender documents
- **Confidence Scoring**: Provides prediction confidence scores
- **Feature Importance**: Shows which factors most influence predictions

### Enhanced Backend Integration
- **Seamless API**: New AI endpoints integrated with existing backend
- **Real-time Analysis**: Process PDFs and get instant AI insights
- **Database Integration**: Stores AI analysis results with tender data
- **Error Handling**: Robust error handling with fallback mechanisms

## 📋 New API Endpoints

### AI Analysis Endpoints

#### 1. Analyze Single PDF
```http
POST /api/ai/analyze-pdf
Content-Type: multipart/form-data

Body: pdf file
```

**Response:**
```json
{
  "message": "AI analysis completed successfully",
  "filename": "tender-document.pdf",
  "analysis": {
    "success": true,
    "data": {
      "contract_name": "ABC Construction",
      "license_category": "C1",
      "project_duration": 90,
      "warranty_period": 24,
      "client_rating": 4,
      "project_success_rate": 95.5,
      "rejection_history": 1,
      "safety_certification": "Yes",
      "bid_amount": 500000
    },
    "prediction": {
      "winner_probability": 0.78,
      "prediction": "Winner",
      "confidence_score": 0.85
    }
  }
}
```

#### 2. Analyze Multiple PDFs
```http
POST /api/ai/analyze-multiple
Content-Type: multipart/form-data

Body: pdf files (up to 10)
```

#### 3. Analyze Existing Tender
```http
POST /api/ai/analyze-tender/:tenderId
```

#### 4. Compare Bids for a Tender
```http
POST /api/ai/compare-bids/:tenderId
```

#### 5. Get AI Model Information
```http
GET /api/ai/model-info
```

### Enhanced Tender Upload
The existing tender upload endpoint now includes AI analysis:

```http
POST /api/tenders/upload
Content-Type: multipart/form-data

Body: pdf file
```

**Enhanced Response:**
```json
{
  "message": "PDF uploaded and AI analysis completed successfully",
  "tender": {
    "_id": "...",
    "contract_name": "ABC Construction",
    "license_category": "C1",
    "project_duration": 90,
    "warranty_period": 24,
    "client_rating": 4,
    "project_success_rate": 95.5,
    "rejection_history": 1,
    "safety_certification": "Yes",
    "bid_amount": 500000
  },
  "aiAnalysis": {
    "success": true,
    "data": { /* extracted data */ },
    "prediction": { /* prediction results */ }
  },
  "extractedData": { /* processed data */ }
}
```

## 🛠️ Setup Instructions

### 1. Install Python Dependencies
```bash
# Navigate to backend directory
cd tender-evaluation-backend

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Install Tesseract (for OCR)
**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download from [Tesseract GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

### 3. Run Setup Script
```bash
# Make script executable
chmod +x setup-ai.sh

# Run setup
./setup-ai.sh
```

### 4. Start the Backend
```bash
npm start
```

## 🔧 Configuration

### Python Path Configuration
The system automatically finds the `TenderPredictor` module by adding the HamroAi directory to the Python path. The path is configured in `extract_pdf_text.py`:

```python
hamro_ai_path = current_dir.parent.parent / "ghar_nirman_1-master" / "ghar_nirman_1-master" / "HamroAi"
sys.path.append(str(hamro_ai_path))
```

### Model Files
The system uses pre-trained models located in the HamroAi directory:
- `xgboost_model.pkl` - Main prediction model
- `scaler.pkl` - Feature scaler
- `kmeans.pkl` - Clustering model

## 📊 AI Model Details

### Features Used
- **Contract Information**: Contract name, license category
- **Financial Data**: Bid amount, project duration, warranty period
- **Performance Metrics**: Project success rate, client rating
- **Quality Indicators**: Rejection history, safety certification

### Prediction Output
- **Winner Probability**: 0-1 score indicating likelihood of winning
- **Confidence Score**: Model confidence in the prediction
- **Feature Importance**: Which factors most influenced the prediction

## 🔍 Usage Examples

### Frontend Integration
```javascript
// Upload PDF with AI analysis
const formData = new FormData();
formData.append('pdf', file);

const response = await fetch('/api/tenders/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('AI Analysis:', result.aiAnalysis);
```

### Direct AI Analysis
```javascript
// Analyze existing tender
const response = await fetch(`/api/ai/analyze-tender/${tenderId}`, {
  method: 'POST'
});

const analysis = await response.json();
console.log('Tender Analysis:', analysis);
```

## 🚨 Error Handling

The system includes comprehensive error handling:

1. **AI Analysis Fails**: Falls back to basic text extraction
2. **Missing Dependencies**: Clear error messages for missing Python packages
3. **File Processing Errors**: Detailed error reporting for PDF processing issues
4. **Model Loading Errors**: Graceful handling of missing model files

## 🔄 Backward Compatibility

All existing endpoints continue to work as before. The AI integration is additive and doesn't break existing functionality:

- ✅ Existing tender uploads still work
- ✅ Basic PDF extraction still available
- ✅ All existing API endpoints unchanged
- ✅ Database schema unchanged

## 📈 Performance

- **Single PDF Analysis**: ~2-5 seconds
- **Multi-PDF Analysis**: ~5-15 seconds per PDF
- **Model Loading**: ~1-2 seconds on first use
- **Memory Usage**: ~100-200MB for AI processing

## 🐛 Troubleshooting

### Common Issues

1. **Import Error**: Check Python path configuration
2. **Tesseract Not Found**: Install Tesseract OCR
3. **Model Files Missing**: Ensure HamroAi directory contains `.pkl` files
4. **Memory Issues**: Reduce batch size for large PDFs

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
export DEBUG_AI=true
npm start
```

## 📝 API Documentation

For complete API documentation, visit:
- `GET /` - API overview and available endpoints
- `GET /api/ai/model-info` - AI model information
- `GET /health` - System health check

## 🤝 Contributing

To extend the AI capabilities:

1. Modify `extract_pdf_text.py` for new extraction methods
2. Update `aiRoutes.js` for new API endpoints
3. Enhance `TenderPredictor` class for new ML features
4. Test with various PDF formats and edge cases

## 📞 Support

For issues with the AI integration:
1. Check the console logs for detailed error messages
2. Verify Python dependencies are installed
3. Ensure Tesseract is properly installed
4. Test with a simple PDF first 