#!/usr/bin/env python3
"""
Test script for the AI Tender Predictor
"""

import sys
import os
import json
from tender_predictor import TenderPredictor

def test_extraction():
    """Test the extraction functionality"""
    print("🧪 Testing AI Tender Predictor")
    print("=" * 50)
    
    # Test with a sample PDF if available
    test_pdf = "test.pdf"
    
    if not os.path.exists(test_pdf):
        print(f"❌ Test PDF not found: {test_pdf}")
        print("Please place a test PDF file named 'test.pdf' in the current directory")
        return False
    
    try:
        predictor = TenderPredictor()
        print(f"📄 Processing: {test_pdf}")
        
        # Test extraction
        extracted_data = predictor.extract_data_from_pdf(test_pdf)
        
        if extracted_data and len(extracted_data) > 0:
            print("✅ Extraction successful!")
            print("📊 Extracted data:")
            for key, value in extracted_data.items():
                print(f"  {key}: {value}")
            
            # Test command line interface
            print("\n🔧 Testing command line interface...")
            import subprocess
            result = subprocess.run([
                "python", "tender_predictor.py", "extract", test_pdf
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Command line interface works!")
                try:
                    output_data = json.loads(result.stdout)
                    print("📋 Command line output:")
                    print(json.dumps(output_data, indent=2))
                except json.JSONDecodeError:
                    print("⚠️ Command line output is not valid JSON")
                    print("Output:", result.stdout)
            else:
                print("❌ Command line interface failed")
                print("Error:", result.stderr)
            
            return True
        else:
            print("❌ No data extracted from PDF")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_without_pdf():
    """Test the predictor without a PDF file"""
    print("\n🧪 Testing predictor initialization...")
    
    try:
        predictor = TenderPredictor()
        print("✅ Predictor initialized successfully")
        
        # Test synthetic data creation
        synthetic_data = predictor.create_synthetic_data(num_samples=5)
        print(f"✅ Synthetic data created: {len(synthetic_data)} samples")
        
        # Test data preprocessing
        X, df = predictor.preprocess_data(synthetic_data)
        if X is not None:
            print("✅ Data preprocessing works")
            print(f"📊 Features shape: {X.shape}")
        else:
            print("❌ Data preprocessing failed")
        
        return True
        
    except Exception as e:
        print(f"❌ Initialization test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 AI Tender Predictor Test Suite")
    print("=" * 50)
    
    # Test 1: Basic initialization
    test1_passed = test_without_pdf()
    
    # Test 2: PDF extraction (if test PDF exists)
    test2_passed = test_extraction()
    
    print("\n📊 Test Results:")
    print(f"✅ Initialization: {'PASSED' if test1_passed else 'FAILED'}")
    print(f"✅ PDF Extraction: {'PASSED' if test2_passed else 'FAILED'}")
    
    if test1_passed:
        print("\n🎉 Basic functionality is working!")
        print("You can now use the AI predictor with the tender management system.")
    else:
        print("\n❌ Basic functionality failed. Please check the installation.") 