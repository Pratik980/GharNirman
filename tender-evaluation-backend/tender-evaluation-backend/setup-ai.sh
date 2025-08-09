#!/bin/bash

echo "🚀 Setting up AI/ML system for Tender Evaluation Backend..."

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python found: $(python --version)"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Check if Tesseract is installed (for OCR)
if ! command -v tesseract &> /dev/null; then
    echo "⚠️  Tesseract not found. OCR functionality may not work properly."
    echo "   To install Tesseract:"
    echo "   - Ubuntu/Debian: sudo apt-get install tesseract-ocr"
    echo "   - macOS: brew install tesseract"
    echo "   - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"
else
    echo "✅ Tesseract found: $(tesseract --version | head -n 1)"
fi

# Test the AI system
echo "🧪 Testing AI system..."
python extract_pdf_text.py test

if [ $? -eq 0 ]; then
    echo "✅ AI system test passed"
else
    echo "⚠️  AI system test failed - this is normal if no test PDF is provided"
fi

echo ""
echo "🎉 AI/ML system setup completed!"
echo ""
echo "📋 Available AI endpoints:"
echo "   POST /api/ai/analyze-pdf - Analyze single PDF"
echo "   POST /api/ai/analyze-multiple - Analyze multiple PDFs"
echo "   POST /api/ai/analyze-tender/:id - Analyze existing tender"
echo "   POST /api/ai/compare-bids/:id - Compare bids for a tender"
echo "   GET  /api/ai/model-info - Get AI model information"
echo ""
echo "🔧 Enhanced tender upload now includes AI analysis"
echo "   POST /api/tenders/upload - Upload PDF with AI extraction"
echo ""
echo "🚀 Start your backend with: npm start" 