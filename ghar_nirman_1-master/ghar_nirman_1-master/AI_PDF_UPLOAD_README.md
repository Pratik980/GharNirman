# AI-Powered PDF Upload and Bid Extraction

## Overview

The tender management system now includes AI-powered PDF processing that automatically extracts bidding data from uploaded PDF documents using the `tender_predictor.py` AI model. When contractors upload PDF files through the "Upload PDF (AI)" button, the system automatically extracts key bidding parameters and creates a bid entry.

## Features

### 🤖 AI-Powered Data Extraction
- **Automatic Parameter Extraction**: Extracts all required bidding parameters from PDF documents
- **Multi-Method Processing**: Uses PDF Plumber and Tesseract OCR for maximum accuracy
- **Intelligent Fallbacks**: Handles various PDF formats and structures
- **Real-time Processing**: Processes PDFs in real-time during upload

### 📊 Extracted Parameters
The AI system automatically extracts the following parameters from PDF documents:

- **Contract Name**: Project or contract title
- **License Category**: Contractor license classification (C1, C2, C3, etc.)
- **Bid Amount**: Total bid value in currency
- **Project Duration**: Timeline in months
- **Warranty Period**: Warranty duration in months
- **Client Rating**: Average client rating (1-5 scale)
- **Project Success Rate**: Success rate percentage
- **Rejection History**: Number of previous rejections
- **Safety Certification**: Safety certification status

### 🎯 Smart Processing
- **Confidence Scoring**: Evaluates extraction quality
- **Data Validation**: Validates extracted data for accuracy
- **Default Values**: Provides sensible defaults for missing parameters
- **Error Handling**: Graceful handling of processing errors

## How It Works

### 1. PDF Upload Process
```
User Uploads PDF → AI Processing → Data Extraction → Bid Creation → Database Storage
```

### 2. AI Processing Pipeline
1. **PDF Upload**: User selects PDF file and clicks "Upload PDF (AI)"
2. **File Processing**: System uploads file to backend
3. **AI Extraction**: `tender_predictor.py` processes the PDF
4. **Data Parsing**: Extracts structured bidding data
5. **Bid Creation**: Creates bid entry with extracted data
6. **Database Storage**: Saves bid to database
7. **User Feedback**: Shows extracted data details to user

### 3. Technical Implementation

#### Backend Integration
- **New Endpoint**: `POST /api/bids/upload`
- **AI Integration**: Calls `tender_predictor.py` for data extraction
- **Error Handling**: Comprehensive error handling and validation
- **Progress Tracking**: Real-time upload progress

#### Frontend Updates
- **Enhanced UI**: Updated button text shows "Upload PDF (AI)"
- **Progress Indicators**: Shows "AI Processing..." during upload
- **Detailed Feedback**: Displays extracted data in success messages
- **Error Messages**: Detailed error information for troubleshooting

## Usage Instructions

### For Contractors

1. **Navigate to Tender Marketplace**
   - Go to the contractor dashboard
   - Click on "Tenders" tab
   - Browse available tenders

2. **Upload PDF with AI Processing**
   - Find a tender you want to bid on
   - Click "Upload PDF (AI)" button
   - Select your PDF document
   - Wait for AI processing (shows progress)
   - Review extracted data in success message

3. **Review and Confirm**
   - Check the extracted data in the success notification
   - Verify bid amount, duration, and other parameters
   - The bid is automatically created and stored

### For Administrators

1. **Monitor AI Processing**
   - Check server logs for AI processing details
   - Monitor extraction success rates
   - Review any processing errors

2. **Manage Extracted Bids**
   - View all bids in the admin dashboard
   - Check extracted data accuracy
   - Approve or reject bids as needed

## Technical Requirements

### Backend Requirements
- **Python 3.8+**: For AI processing
- **PDF Plumber**: PDF text extraction
- **Tesseract OCR**: Image-based text extraction
- **OpenCV**: Image preprocessing
- **NumPy/Pandas**: Data processing

### Installation Steps

1. **Install Python Dependencies**
   ```bash
   cd ghar_nirman_1-master/ghar_nirman_1-master/HamroAi
   pip install pdfplumber pytesseract opencv-python numpy pandas
   ```

2. **Install Tesseract OCR**
   - **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki
   - **macOS**: `brew install tesseract`
   - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`

3. **Test AI Predictor**
   ```bash
   cd ghar_nirman_1-master/ghar_nirman_1-master/HamroAi
   python test_predictor.py
   ```

## API Endpoints

### Upload PDF with AI Extraction
```
POST /api/bids/upload
Content-Type: multipart/form-data

Parameters:
- pdf: PDF file
- tenderId: Tender ID
- contractorId: Contractor ID

Response:
{
  "message": "PDF uploaded and bid data extracted successfully",
  "bid": { ... },
  "extractedData": {
    "contract_name": "...",
    "license_category": "...",
    "bid_amount": 500000,
    "project_duration": 12,
    "warranty_period": 24,
    "client_rating": 4.5,
    "project_success_rate": 85.0,
    "rejection_history": 1,
    "safety_certification": "Yes"
  }
}
```

## Error Handling

### Common Issues and Solutions

1. **PDF Processing Errors**
   - **Issue**: PDF is password protected
   - **Solution**: Remove password protection before upload

2. **AI Extraction Failures**
   - **Issue**: No text found in PDF
   - **Solution**: Ensure PDF contains readable text or use OCR-compatible format

3. **Timeout Errors**
   - **Issue**: Large PDF files take too long to process
   - **Solution**: Split large PDFs or optimize file size

4. **Missing Parameters**
   - **Issue**: Some parameters not extracted
   - **Solution**: System provides default values, can be manually adjusted

## Testing

### Test the AI Predictor
```bash
cd ghar_nirman_1-master/ghar_nirman_1-master/HamroAi
python test_predictor.py
```

### Test with Sample PDF
1. Place a test PDF file named `test.pdf` in the HamroAi directory
2. Run the test script
3. Check extracted data output

### Manual Testing
1. Start the backend server
2. Start the frontend application
3. Upload a PDF through the tender marketplace
4. Verify extracted data in the success message

## Configuration

### AI Processing Settings
The AI predictor can be configured in `tender_predictor.py`:

```python
class TenderPredictor:
    def __init__(self):
        self.confidence_threshold = 0.7  # Minimum confidence for extraction
        self.max_pages = 50  # Maximum pages to process
        self.ocr_timeout = 180  # OCR processing timeout
```

### Backend Configuration
In `bidRoutes.js`, you can adjust:
- File upload limits
- Processing timeouts
- Error handling behavior

## Troubleshooting

### Debug AI Processing
1. Check server logs for detailed processing information
2. Verify Python dependencies are installed
3. Ensure Tesseract OCR is properly installed
4. Test with a simple PDF first

### Common Error Messages
- **"Python script not found"**: Check file paths in bidRoutes.js
- **"Tesseract not available"**: Install Tesseract OCR
- **"No data extracted"**: PDF may not contain extractable text
- **"Processing timeout"**: Large files may need more time

## Performance Optimization

### For Large PDFs
- Use text-based PDFs when possible
- Optimize image quality for OCR
- Consider splitting very large documents

### For Better Accuracy
- Ensure PDFs have clear, readable text
- Use standard formatting for bid documents
- Include all required parameters in the PDF

## Future Enhancements

### Planned Features
- **Machine Learning Training**: Improve extraction accuracy over time
- **Template Recognition**: Recognize common bid document formats
- **Batch Processing**: Process multiple PDFs simultaneously
- **Advanced OCR**: Better handling of complex layouts

### Integration Opportunities
- **Document Templates**: Pre-formatted bid document templates
- **Validation Rules**: Business rules for bid validation
- **Analytics Dashboard**: Processing statistics and success rates

## Support

For technical support or feature requests:
1. Check the troubleshooting section above
2. Review server logs for detailed error information
3. Test with the provided test script
4. Contact the development team for assistance

## License

This AI-powered PDF processing feature is part of the tender management system and follows the same licensing terms as the main project. 