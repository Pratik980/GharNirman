#!/usr/bin/env python3
"""
Complete Tender Prediction System
Combines PDF extraction, data processing, and XGBoost prediction for tender winner analysis
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
import xgboost as xgb
from xgboost import XGBClassifier
import warnings
warnings.filterwarnings('ignore')

# PDF processing libraries
import pdfplumber
from PIL import Image
import cv2
import re
import os
from typing import Dict, List

# Tesseract OCR with fallback
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
    # Don't print debug message at module level to avoid stdout pollution
except ImportError:
    TESSERACT_AVAILABLE = False
    # Don't print debug message at module level to avoid stdout pollution

# Check if tesseract executable is available
def check_tesseract_installation():
    """Check if Tesseract OCR is properly installed and accessible"""
    if not TESSERACT_AVAILABLE:
        return False
    
    try:
        # Try to get tesseract version
        pytesseract.get_tesseract_version()
        return True
    except Exception as e:
        print(f"⚠️  Tesseract OCR not properly installed: {e}")
        return False

TESSERACT_WORKING = check_tesseract_installation()

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

class TenderPredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = [
            'contractor_name', 'contract_name', 'license_category', 
            'project_duration', 'warranty_period', 'client_rating',
            'project_success_rate', 'rejection_history', 'safety_certification',
            'bid_amount'
        ]
        
        # Maintain compatibility with existing API
        self.required_params = {
            'contractor_name': r'Contractor Name:\s*(.+)',
            'license_category': r'License Category:\s*([A-Za-z0-9\- ]+)',
            'bid_amount': r'Bid Amount:\s*([\d,]+\.?\d*)',
            'project_duration': r'Project Duration \(days\):\s*(\d+)',
            'warranty_offered': r'Warranty \(months\):\s*(\d+)',
            'years_experience': r'Years of Experience:\s*(\d+)',
            'success_rate': r'Success Rate \(%\):\s*(\d+\.?\d*)',
            'client_rating': r'Client Rating \(1-5\):\s*(\d)',
            'rejection_history': r'Rejection History \(count\):\s*(\d+)',
            'safety_certification': r'Safety Certification \(Yes/No\):\s*(\w+)',
        }
        
        # Remove specialization from d_categories
        self.d_categories = {
            'license_category': []
        }
        
        self.feature_importance = None

    def extract_data_from_pdf(self, pdf_path):
        """
        Extract tender data from PDF using optimized OCR and text extraction
        """
        print(f"\nExtracting data from: {pdf_path}")
        print("-" * 60)
        
        extracted_data = {}
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Process ALL pages for complete data extraction
                total_pages = len(pdf.pages)
                print(f"📄 Processing ALL {total_pages} pages for complete data extraction...")
                
                for page_num, page in enumerate(pdf.pages, 1):
                    print(f"Processing page {page_num}...")
                    # Method 1: Try text extraction first
                    text = page.extract_text()
                    print(f"[DEBUG] Page {page_num} text: {text[:500]}")
                    
                    # Debug: Look for contractor-related text
                    contractor_debug = re.findall(r'(?i)(contractor|company|firm|name)[\s\-\:]*([^\n\r]+)', text)
                    if contractor_debug:
                        print(f"[DEBUG] Found contractor-related text on page {page_num}:")
                        for match in contractor_debug[:5]:  # Show first 5 matches
                            print(f"    '{match[0]}': '{match[1].strip()}'")
                    
                    tables = page.extract_tables()
                    
                    # Process text for tender information
                    tender_info = self._parse_tender_text(text)
                    table_data = self._parse_tender_tables(tables)
                    combined_data = {**tender_info, **table_data}
                    
                    # Method 2: Quick OCR only if text extraction fails
                    if not combined_data and len(text.strip()) < 50:
                        print(f"  🔍 Quick OCR for page {page_num}")
                        ocr_data = self._quick_ocr_extraction(page, page_num)
                        combined_data = {**combined_data, **ocr_data}
                    
                    if combined_data:
                        # Merge with existing data for this PDF
                        for key, value in combined_data.items():
                            # Only set license_category if not already set, or if the new value is more specific (contains C1/C2)
                            if key == 'license_category':
                                if ('license_category' not in extracted_data or extracted_data['license_category'] is None):
                                    extracted_data['license_category'] = value
                                    print(f"  🏷️ Set license_category: {value}")
                                elif re.search(r'C\d+\s*[–\-]', value) and not re.search(r'C\d+\s*[–\-]', extracted_data['license_category']):
                                    # Overwrite only if new value is more specific
                                    extracted_data['license_category'] = value
                                    print(f"  🏷️ Overwrote license_category with more specific value: {value}")
                            else:
                                if key not in extracted_data or extracted_data[key] is None:
                                    extracted_data[key] = value
                        
                        print(f"Page {page_num} - Data extracted:")
                        for key, value in combined_data.items():
                            if key in self.feature_names:
                                print(f"  ✅ {key}: {value}")
                    
                    # Quick bid amount extraction from any page (not just page 38)
                    if 'bid_amount' not in extracted_data or extracted_data['bid_amount'] is None:
                        print(f"  Looking for bid amount on page {page_num}...")
                        
                        # Simple bid amount patterns
                        bid_patterns = [
                            r'Bid Amount\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'Amount\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'Total\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'Price\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'Cost\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'[\$₹€]?\s*([\d,]{5,}(?:\.\d+)?)'  # Large amounts
                        ]
                        
                        for pattern in bid_patterns:
                            matches = re.findall(pattern, text, re.IGNORECASE)
                            if matches:
                                # Convert to float and find the largest amount
                                amounts = [float(match.replace(',', '')) for match in matches if match.replace(',', '').replace('.', '').isdigit()]
                                if amounts:
                                    largest_amount = max(amounts)
                                    if largest_amount > 1000:  # Only consider substantial amounts
                                        extracted_data['bid_amount'] = largest_amount
                                        print(f"  🎯 Found bid amount on page {page_num}: {largest_amount}")
                                        break
                # --- NEW: Always check page 38 for bid amount ---
                if total_pages >= 38:
                    page_38 = pdf.pages[37]
                    text_38 = page_38.extract_text()
                    if text_38:
                        match = re.search(r'Bid Amount\s*[:\-]*\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)', text_38)
                        if match:
                            value = match.group(1).replace(',', '')
                            try:
                                value = float(value)
                                if value > 1000:
                                    extracted_data['bid_amount'] = value
                                    print(f"  🏆 Overriding bid_amount with value from page 38: {value}")
                            except Exception as e:
                                print(f"  ⚠️  Error parsing bid_amount from page 38: {e}")
            
            # Check if all required parameters were extracted
            missing_params = []
            for param in self.feature_names:
                if param not in extracted_data or extracted_data[param] is None:
                    missing_params.append(param)
            
            # Enhanced extraction for missing parameters
            if missing_params:
                print(f"🔍 Enhanced extraction for missing parameters: {missing_params}")
                
                # Try to extract more data from all pages with enhanced patterns
                enhanced_data = self._enhanced_extraction(pdf_path, missing_params)
                for key, value in enhanced_data.items():
                    if key in missing_params and (key not in extracted_data or extracted_data[key] is None):
                        extracted_data[key] = value
                        print(f"  ✅ Enhanced extraction found {key}: {value}")
                        missing_params.remove(key)
            
            # Final check for remaining missing parameters
            if missing_params:
                print(f"⚠️  Still missing parameters after enhanced extraction: {missing_params}")
                print("Setting reasonable defaults for missing parameters...")
                
                # Set more realistic defaults based on extracted data
                if 'contract_name' in missing_params:
                    extracted_data['contract_name'] = f"Contract_{extracted_data.get('license_category', 'A')}_{int(extracted_data.get('bid_amount', 1000000) / 100000)}"
                
                if 'project_duration' in missing_params:
                    # Estimate based on bid amount
                    bid_amount = extracted_data.get('bid_amount', 1000000)
                    if bid_amount > 5000000:
                        extracted_data['project_duration'] = 36  # Large project
                    elif bid_amount > 2000000:
                        extracted_data['project_duration'] = 24  # Medium project
                    else:
                        extracted_data['project_duration'] = 12  # Small project
                
                if 'warranty_period' in missing_params:
                    # Estimate based on project duration
                    duration = extracted_data.get('project_duration', 12)
                    extracted_data['warranty_period'] = max(12, duration * 2)  # 2x duration or 12 months minimum
                
                if 'project_success_rate' in missing_params:
                    # Estimate based on client rating
                    rating = extracted_data.get('client_rating', 4.0)
                    extracted_data['project_success_rate'] = min(100, max(60, rating * 20))  # Rating * 20, capped at 100
                
                if 'bid_amount' in missing_params:
                    print(f"  ⚠️  No bid amount found - this is critical for analysis")
                    extracted_data['bid_amount'] = 1000000  # Default value
                
                print("✅ All parameters now have values (extracted or estimated)")
            else:
                print("✅ All required parameters extracted successfully!")
                        
        except Exception as e:
            print(f"❌ Error processing PDF: {e}")
            
        return extracted_data

    def _enhanced_extraction(self, pdf_path, missing_params):
        """
        Enhanced extraction method that scans all pages with more comprehensive patterns
        """
        enhanced_data = {}
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                print(f"🔍 Enhanced extraction scanning all {len(pdf.pages)} pages...")
                
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if not text:
                        continue
                    
                    # Enhanced patterns for each missing parameter
                    if 'contract_name' in missing_params:
                        contract_patterns = [
                            r'(?i)Contract\s*Name\s*[:\-]\s*([^\n\r]+)',
                            r'(?i)Project\s*Name\s*[:\-]\s*([^\n\r]+)',
                            r'(?i)Tender\s*Name\s*[:\-]\s*([^\n\r]+)',
                            r'(?i)Work\s*Description\s*[:\-]\s*([^\n\r]+)',
                            r'(?i)Contract\s*Title\s*[:\-]\s*([^\n\r]+)',
                            r'(?i)Project\s*Title\s*[:\-]\s*([^\n\r]+)'
                        ]
                        
                        for pattern in contract_patterns:
                            match = re.search(pattern, text)
                            if match:
                                contract_name = match.group(1).strip()
                                if len(contract_name) > 5:  # Valid contract name
                                    enhanced_data['contract_name'] = contract_name
                                    print(f"  📄 Page {page_num}: Found contract name: {contract_name}")
                                    break
                    
                    if 'project_duration' in missing_params:
                        duration_patterns = [
                            r'(?i)Duration\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                            r'(?i)Project\s*Duration\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                            r'(?i)Contract\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                            r'(?i)Time\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                            r'(?i)Completion\s*Time\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)'
                        ]
                        
                        for pattern in duration_patterns:
                            match = re.search(pattern, text)
                            if match:
                                duration = int(match.group(1))
                                # Convert to months if needed
                                if 'year' in text.lower():
                                    duration *= 12
                                elif 'day' in text.lower():
                                    duration = max(1, duration // 30)
                                enhanced_data['project_duration'] = duration
                                print(f"  ⏱️ Page {page_num}: Found project duration: {duration} months")
                                break
                    
                    if 'warranty_period' in missing_params:
                        warranty_patterns = [
                            r'(?i)Warranty\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                            r'(?i)Warranty\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                            r'(?i)Guarantee\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                            r'(?i)Maintenance\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)'
                        ]
                        
                        for pattern in warranty_patterns:
                            match = re.search(pattern, text)
                            if match:
                                warranty = int(match.group(1))
                                # Convert to months if needed
                                if 'year' in text.lower():
                                    warranty *= 12
                                elif 'day' in text.lower():
                                    warranty = max(1, warranty // 30)
                                enhanced_data['warranty_period'] = warranty
                                print(f"  🛡️ Page {page_num}: Found warranty period: {warranty} months")
                                break
                    
                    if 'project_success_rate' in missing_params:
                        success_patterns = [
                            r'(?i)Success\s*Rate\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                            r'(?i)Completion\s*Rate\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                            r'(?i)Performance\s*Rate\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                            r'(?i)Track\s*Record\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%'
                        ]
                        
                        for pattern in success_patterns:
                            match = re.search(pattern, text)
                            if match:
                                success_rate = float(match.group(1))
                                enhanced_data['project_success_rate'] = success_rate
                                print(f"  📈 Page {page_num}: Found success rate: {success_rate}%")
                                break
                    
                    if 'bid_amount' in missing_params:
                        # Enhanced bid amount patterns
                        bid_patterns = [
                            r'(?i)Bid\s*Amount\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Total\s*Amount\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Contract\s*Value\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Project\s*Cost\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Tender\s*Value\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Estimated\s*Cost\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Budget\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Price\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Cost\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Value\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Amount\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)Rs\.?\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)₹\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)\$\s*([\d,]+(?:\.\d+)?)',
                            r'(?i)([\d,]{6,}(?:\.\d+)?)\s*(?:lakhs?|crores?|million)',
                            r'(?i)([\d,]+(?:\.\d+)?)\s*(?:lakhs?|crores?|million)\s*(?:rupees?|USD)'
                        ]
                        
                        all_amounts = []
                        for pattern in bid_patterns:
                            matches = re.findall(pattern, text)
                            for match in matches:
                                try:
                                    amount = float(match.replace(',', ''))
                                    if amount >= 1000 and amount <= 1000000000:  # Reasonable range
                                        all_amounts.append(amount)
                                except:
                                    continue
                        
                        if all_amounts:
                            # Take the largest amount as bid amount
                            bid_value = max(all_amounts)
                            enhanced_data['bid_amount'] = bid_value
                            print(f"  💰 Page {page_num}: Found bid amount: {bid_value}")
                    
                    # Check if we found all missing parameters
                    if len(enhanced_data) == len(missing_params):
                        print(f"✅ Enhanced extraction completed - found all missing parameters")
                        break
                        
        except Exception as e:
            print(f"⚠️ Enhanced extraction error: {e}")
        
        return enhanced_data

    def _quick_ocr_extraction(self, page, page_num):
        """
        Quick OCR extraction with minimal preprocessing for speed
        """
        ocr_data = {}
        
        # Check if Tesseract is available and working
        if not TESSERACT_WORKING:
            print(f"  ⚠️  OCR skipped for page {page_num} - Tesseract not available")
            return ocr_data
        
        try:
            # Convert PDF page to image
            page_image = page.to_image()
            pil_image = page_image.original
            
            # Quick preprocessing - just grayscale and threshold
            try:
                cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
                _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                processed_image = Image.fromarray(binary)
            except:
                processed_image = pil_image  # Use original if preprocessing fails
            
            # Single OCR attempt with best config
            ocr_text = pytesseract.image_to_string(processed_image, config='--psm 6')
            
            if len(ocr_text.strip()) > 20:  # Only process if we got meaningful text
                print(f"  📸 Quick OCR extracted {len(ocr_text)} characters from page {page_num}")
                
                # Parse OCR text for tender information
                ocr_tender_info = self._parse_tender_text(ocr_text)
                ocr_table_data = self._extract_tables_from_ocr_text(ocr_text)
                
                # Combine OCR results
                ocr_data = {**ocr_tender_info, **ocr_table_data}
                
                if ocr_data:
                    print(f"  ✅ Found {len(ocr_data)} parameters with quick OCR")
            
        except Exception as e:
            print(f"  ⚠️  Quick OCR failed for page {page_num}: {e}")
            
        return ocr_data
    
    def _extract_bid_amount_with_ocr(self, page, page_num):
        """
        Extract bid amount using enhanced OCR specifically for page 38
        """
        ocr_data = {}
        
        # Check if Tesseract is available and working
        if not TESSERACT_WORKING:
            print(f"  ⚠️  Enhanced OCR skipped for page {page_num} - Tesseract not available")
            return ocr_data
        
        try:
            # Convert PDF page to image
            page_image = page.to_image()
            pil_image = page_image.original
            
            # Enhanced preprocessing for better OCR
            try:
                cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
                
                # Apply noise reduction
                denoised = cv2.fastNlMeansDenoising(gray)
                
                # Apply adaptive thresholding
                binary = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
                
                # Apply morphological operations
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
                cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
                
                processed_image = Image.fromarray(cleaned)
            except:
                processed_image = pil_image  # Use original if preprocessing fails
            
            # Multiple OCR attempts with different configurations for better accuracy
            ocr_configs = [
                '--psm 6',  # Uniform block of text
                '--psm 3',  # Fully automatic page segmentation
                '--psm 4',  # Assume a single column of text
                '--psm 8',  # Single word
                '--psm 11',  # Sparse text with OSD
                '--psm 12',  # Sparse text with OSD
                '--psm 13'   # Raw line
            ]
            
            best_ocr_text = ""
            for config in ocr_configs:
                try:
                    ocr_text = pytesseract.image_to_string(processed_image, config=config)
                    if len(ocr_text.strip()) > len(best_ocr_text.strip()):
                        best_ocr_text = ocr_text
                except:
                    continue
            
            if len(best_ocr_text.strip()) > 20:
                print(f"  📸 Enhanced OCR extracted {len(best_ocr_text)} characters from page {page_num}")
                print(f"  📝 OCR Text preview: {best_ocr_text[:300]}...")
                
                # Comprehensive bid amount patterns for OCR text
                bid_patterns = [
                    # Specific bid amount patterns
                    r'Bid Amount\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Bid Amount\s*=\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Bid Amount\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Bid\s*Amount\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Bid\s*Amount\s*=\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    
                    # General amount patterns
                    r'Amount\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Total\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Value\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Price\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'Cost\s*[:\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    
                    # Currency patterns
                    r'Rs\.?\s*([\d,]+(?:\.\d+)?)',
                    r'₹\s*([\d,]+(?:\.\d+)?)',
                    r'\$\s*([\d,]+(?:\.\d+)?)',
                    r'[\$₹€]?\s*([\d,]+(?:\.\d+)?)\s*(?:USD|dollars?|rupees?)',
                    
                    # Large amount patterns
                    r'([\d,]{6,}(?:\.\d+)?)\s*(?:lakhs?|crores?|million)',
                    r'([\d,]+(?:\.\d+)?)\s*(?:lakhs?|crores?|million)\s*(?:rupees?|USD)',
                    
                    # Numbers with specific digit counts
                    r'([\d,]{7,}(?:\.\d+)?)',  # Numbers with 7+ digits
                    r'([\d,]{6,}(?:\.\d+)?)',  # Numbers with 6+ digits
                    r'([\d,]{5,}(?:\.\d+)?)'   # Numbers with 5+ digits
                ]
                
                all_matches = []
                for pattern in bid_patterns:
                    matches = re.findall(pattern, best_ocr_text, re.IGNORECASE)
                    if matches:
                        all_matches.extend(matches)
                        print(f"  💰 OCR Pattern found: {matches}")
                
                if all_matches:
                    print(f"  💰 All OCR amounts found: {all_matches}")
                    # Try to find the most appropriate bid amount
                    valid_amounts = []
                    for match in all_matches:
                        try:
                            amount = float(match.replace(',', ''))
                            # Accept reasonable range for bid amounts
                            if amount >= 1000 and amount <= 1000000000:  # $1K to 1000 crores
                                valid_amounts.append(amount)
                        except:
                            continue
                    
                    if valid_amounts:
                        # Sort by amount size and take the largest reasonable amount
                        valid_amounts.sort(reverse=True)
                        bid_value = max(valid_amounts)
                        print(f"  🎯 OCR found bid amount: {bid_value}")
                        ocr_data['bid_amount'] = bid_value
                    else:
                        print(f"  ⚠️  No valid amounts found in OCR text")
                else:
                    print(f"  ⚠️  No bid amount patterns found in OCR text")
            
        except Exception as e:
            print(f"  ⚠️  Enhanced OCR failed for page {page_num}: {e}")
            
        return ocr_data
    
    def _extract_tables_from_ocr_text(self, ocr_text):
        """
        Extract table-like data from OCR text using pattern matching
        """
        table_data = {}
        
        # Split text into lines
        lines = ocr_text.split('\n')
        
        # Look for key-value patterns in OCR text
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Pattern for key-value pairs - specific parameter names
            patterns = {
                'contract_name': [
                    r'(?i)Contract Name:\s*([^\n\r]+)',
                    r'(?i)Project Name:\s*([^\n\r]+)',
                    r'(?i)Tender Name:\s*([^\n\r]+)',
                    r'(?i)Work Description:\s*([^\n\r]+)',
                    r'(?i)Contract Title:\s*([^\n\r]+)',
                    r'(?i)Project Title:\s*([^\n\r]+)',
                    r'(?i)Name of Work:\s*([^\n\r]+)',
                    r'(?i)Description of Work:\s*([^\n\r]+)',
                    r'(?i)Contract Name:\s*([^\n\r]+)',
                    r'(?i)Name\s*of\s*Work:\s*([^\n\r]+)',
                    r'(?i)Description\s*of\s*Work:\s*([^\n\r]+)'
                ],
                'license_category': [
                    r'(?i)Contractor License Category:\s*([^\n\r]+)',
                    r'(?i)License Category:\s*([^\n\r]+)',
                    r'(?i)Category:\s*([^\n\r]+)',
                    r'(?i)Class:\s*([^\n\r]+)',
                    r'(?i)Grade:\s*([^\n\r]+)',
                    r'(?i)Category:\s*([^\n\r]+)',
                    r'(?i)C\d+\s*[–\-]\s*([^\n\r]+)',
                    r'(?i)([A-C]\d*)\s*[–\-]\s*([^\n\r]+)'
                ],
                'project_duration': [
                    r'(?i)Project Duration:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Duration:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Contract Period:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Time Period:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Completion Time:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Period:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Duration:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Duration:\s*([^\n\r]+)\s*(?:months?|days?|years?)',
                    r'(?i)Time\s*Period:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Completion\s*Time:\s*(\d+)\s*(?:months?|days?|years?)'
                ],
                'warranty_period': [
                    r'(?i)Warranty Period:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Warranty:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Guarantee:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Maintenance Period:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Defect Liability:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Warranty:\s*([^\n\r]+)\s*(?:months?|days?|years?)',
                    r'(?i)Period:\s*(\d+)\s*(?:months?|days?|years?)',
                    r'(?i)Duration:\s*(\d+)\s*(?:months?|days?|years?)'
                ],
                'client_rating': [
                    r'(?i)Average Client Rating:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Client Rating:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Rating:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Performance Rating:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Quality Rating:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Rating:\s*([^\n\r]+)',
                    r'(?i)Score:\s*(\d+(?:\.\d+)?)'
                ],
                'project_success_rate': [
                    r'(?i)Project Success Rate:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Success Rate:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Success:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Completion Rate:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Performance Rate:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Track Record:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Success Rate:\s*([^\n\r]+)\s*%',
                    r'(?i)Success\s*Rate:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Success\s*([^\n\r]+)\s*%',
                    r'(?i)Completion\s*Rate:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Performance\s*Rate:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Track\s*Record:\s*(\d+(?:\.\d+)?)\s*%',
                    r'(?i)Success\s*Rate:\s*([^\n\r]+)\s*%'
                ],
                'rejection_history': [
                    r'(?i)Rejection History:\s*(\d+)',
                    r'(?i)Rejections:\s*(\d+)',
                    r'(?i)Failed Bids:\s*(\d+)',
                    r'(?i)Rejected Tenders:\s*(\d+)',
                    r'(?i)Rejection:\s*([^\n\r]+)',
                    r'(?i)History:\s*(\d+)'
                ],
                'safety_certification': [
                    r'(?i)Safety Certification:\s*([^\n\r]+)',
                    r'(?i)Safety:\s*([^\n\r]+)',
                    r'(?i)Certification:\s*([^\n\r]+)',
                    r'(?i)Safety Record:\s*([^\n\r]+)',
                    r'(?i)Safety:\s*([^\n\r]+)',
                    r'(?i)ISO:\s*([^\n\r]+)',
                    r'(?i)Quality Certification:\s*([^\n\r]+)'
                ],
                'bid_amount': [
                    r'(?i)Bid Amount:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Total Amount:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Contract Value:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Project Cost:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Tender Value:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Estimated Cost:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Budget:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Price:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Cost:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Value:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Amount:\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)Rs\.?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)₹\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)\$\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)(?:Total|Bid|Contract)\s*(?:Amount|Value|Price):\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                    r'(?i)([\d,]{6,}(?:\.\d+)?)\s*(?:lakhs?|crores?|million)',
                    r'(?i)([\d,]+(?:\.\d+)?)\s*(?:lakhs?|crores?|million)\s*(?:rupees?|USD)',
                    r'(?i)Bid Amount:\s*([^\n\r]+)',
                    r'(?i)Bid Amount:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Amount:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Bid\s*Amount:\s*([^\n\r]+)',
                    r'(?i)Bid\s*Amount:\s*(\d+(?:\.\d+)?)',
                    r'(?i)Amount:\s*(\d+(?:\.\d+)?)'
                ]
            }
            
            for field, pattern_list in patterns.items():
                for pattern in pattern_list:
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match and field not in table_data:
                        value = match.group(1).strip()
                        
                        # Convert to appropriate data type
                        if field == 'bid_amount':
                            try:
                                value = float(value.replace(',', ''))
                            except:
                                continue
                        elif field in ['client_rating', 'project_success_rate']:
                            try:
                                value = float(value)
                            except:
                                continue
                        elif field in ['project_duration', 'warranty_period', 'rejection_history']:
                            try:
                                value = int(value)
                            except:
                                continue
                        elif field == 'license_category':
                            # Only strip whitespace, do not map or force to A/B/C
                            value = value.strip()
                        elif field == 'safety_certification':
                            # Standardize safety certification
                            value = value.strip().lower()
                            if any(word in value for word in ['yes', 'true', '1', 'certified', 'approved']):
                                value = 'Yes'
                            elif any(word in value for word in ['no', 'false', '0', 'not']):
                                value = 'No'
                            else:
                                value = 'Yes'  # Default to Yes if unclear
                        
                        table_data[field] = value
                        break  # Found a match, move to next line
        
        return table_data
    
    def _parse_tender_text(self, text):
        """
        Parse tender information from text using specific parameter names
        """
        tender_data = {}
        
        # Comprehensive patterns for all possible parameter variations
        patterns = {
            'contractor_name': [
                r'(?i)Contractor\s*Name\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Contractor\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Company\s*Name\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Firm\s*Name\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Name\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Contractor\s*Name\s*[•\s]*([^\n\r]+)',
                r'(?i)Contractor\s*[•\s]*([^\n\r]+)',
                r'(?i)Company\s*[•\s]*([^\n\r]+)',
                r'(?i)Firm\s*[•\s]*([^\n\r]+)',
                r'(?i)Name\s*[•\s]*([^\n\r]+)',
                r'(?i)Contractor\s*Name\s*=\s*([^\n\r]+)',
                r'(?i)Contractor\s*=\s*([^\n\r]+)',
                r'(?i)Company\s*=\s*([^\n\r]+)',
                r'(?i)Firm\s*=\s*([^\n\r]+)',
                r'(?i)Name\s*=\s*([^\n\r]+)',
                # More flexible patterns
                r'(?i)Contractor\s*Name\s*([^\n\r]+)',
                r'(?i)Contractor\s*([^\n\r]+)',
                r'(?i)Company\s*([^\n\r]+)',
                r'(?i)Firm\s*([^\n\r]+)',
                r'(?i)Name\s*([^\n\r]+)'
            ],
            'contract_name': [
                r'(?i)Contract\s*Name\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Project\s*Name\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Tender\s*Name\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Work\s*Description\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Contract\s*Title\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Project\s*Title\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Contract\s*Name\s*[•\s]*([^\n\r]+)',
                r'(?i)Name\s*of\s*Work\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Description\s*of\s*Work\s*[:\-]\s*([^\n\r]+)'
            ],
            'license_category': [
                r'(?i)Contractor\s*License\s*Category\s*[:\-]\s*([^\n\r]+)',
                r'(?i)License\s*Category\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Category\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Class\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Grade\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Category\s*[•\s]*([^\n\r]+)',
                r'(?i)C\d+\s*[–\-]\s*([^\n\r]+)',
                r'(?i)([A-C]\d*)\s*[–\-]\s*([^\n\r]+)'
            ],
            'project_duration': [
                r'(?i)Project\s*Duration\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Duration\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Contract\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Time\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Completion\s*Time\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Duration\s*[•\s]*(\d+)\s*(?:months?|days?|years?)'
            ],
            'warranty_period': [
                r'(?i)Warranty\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Warranty\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Guarantee\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Maintenance\s*Period\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Defect\s*Liability\s*[:\-]\s*(\d+)\s*(?:months?|days?|years?)',
                r'(?i)Warranty\s*[•\s]*(\d+)\s*(?:months?|days?|years?)'
            ],
            'client_rating': [
                r'(?i)Average\s*Client\s*Rating\s*[:\-]\s*(\d+(?:\.\d+)?)',
                r'(?i)Client\s*Rating\s*[:\-]\s*(\d+(?:\.\d+)?)',
                r'(?i)Rating\s*[:\-]\s*(\d+(?:\.\d+)?)',
                r'(?i)Performance\s*Rating\s*[:\-]\s*(\d+(?:\.\d+)?)',
                r'(?i)Quality\s*Rating\s*[:\-]\s*(\d+(?:\.\d+)?)',
                r'(?i)Rating\s*[•\s]*(\d+(?:\.\d+)?)',
                r'(?i)Score\s*[:\-]\s*(\d+(?:\.\d+)?)'
            ],
            'project_success_rate': [
                r'(?i)Project\s*Success\s*Rate\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                r'(?i)Success\s*Rate\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                r'(?i)Success\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                r'(?i)Completion\s*Rate\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                r'(?i)Performance\s*Rate\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                r'(?i)Track\s*Record\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%',
                r'(?i)Success\s*Rate\s*[•\s]*(\d+(?:\.\d+)?)\s*%'
            ],
            'rejection_history': [
                r'(?i)Rejection\s*History\s*[:\-]\s*(\d+)',
                r'(?i)Rejections\s*[:\-]\s*(\d+)',
                r'(?i)Failed\s*Bids\s*[:\-]\s*(\d+)',
                r'(?i)Rejected\s*Tenders\s*[:\-]\s*(\d+)',
                r'(?i)Rejection\s*[•\s]*(\d+)',
                r'(?i)History\s*[:\-]\s*(\d+)'
            ],
            'safety_certification': [
                r'(?i)Safety\s*Certification\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Safety\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Certification\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Safety\s*Record\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Safety\s*[•\s]*([^\n\r]+)',
                r'(?i)ISO\s*[:\-]\s*([^\n\r]+)',
                r'(?i)Quality\s*Certification\s*[:\-]\s*([^\n\r]+)'
            ],
            'bid_amount': [
                r'(?i)Bid\s*Amount\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Total\s*Amount\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Contract\s*Value\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Project\s*Cost\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Tender\s*Value\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Estimated\s*Cost\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Budget\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Price\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Cost\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Value\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Amount\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Rs\.?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)₹\s*([\d,]+(?:\.\d+)?)',
                r'(?i)\$\s*([\d,]+(?:\.\d+)?)',
                r'(?i)(?:Total|Bid|Contract)\s*(?:Amount|Value|Price)\s*[:\-]\s*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)([\d,]{6,}(?:\.\d+)?)\s*(?:lakhs?|crores?|million)',
                r'(?i)([\d,]+(?:\.\d+)?)\s*(?:lakhs?|crores?|million)\s*(?:rupees?|USD)',
                r'(?i)Bid\s*Amount\s*[•\s]*[\$₹€]?\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Bid\s*Amount\s*([\d,]+(?:\.\d+)?)',
                r'(?i)Amount\s*([\d,]+(?:\.\d+)?)'
            ]
        }
        
        for field, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    
                    # Convert to appropriate data type with enhanced handling
                    try:
                        if field == 'bid_amount':
                            # Handle currency symbols and text
                            value = re.sub(r'[^\d.,]', '', value)
                            value = float(value.replace(',', ''))
                        elif field in ['client_rating', 'project_success_rate']:
                            # Handle percentage signs and text
                            value = re.sub(r'[^\d.]', '', value)
                            value = float(value)
                        elif field in ['project_duration', 'warranty_period', 'rejection_history']:
                            # Handle text and extract numbers
                            value = re.sub(r'[^\d]', '', value)
                            value = int(value) if value else 0
                        elif field == 'license_category':
                            # Only strip whitespace, do not map or force to A/B/C
                            value = value.strip()
                        elif field == 'safety_certification':
                            # Standardize safety certification
                            value = value.strip().lower()
                            if any(word in value for word in ['yes', 'true', '1', 'certified', 'approved']):
                                value = 'Yes'
                            elif any(word in value for word in ['no', 'false', '0', 'not']):
                                value = 'No'
                            else:
                                value = 'Yes'  # Default to Yes if unclear
                        elif field == 'contractor_name':
                            # Handle contractor name with fallback
                            value = value.strip()
                            if not value or value.lower() in ['undefined', 'null', 'none', '']:
                                print(f"  ⚠️  Contractor name extracted as invalid: '{value}'")
                                # Try to find any company-like text in the document
                                company_patterns = [
                                    r'(?i)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Construction|Builders|Developers|Ltd|LLC|Inc|Corp|Company|Firm))',
                                    r'(?i)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:&|and)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                                    r'(?i)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+[A-Z][a-z]+)'
                                ]
                                for company_pattern in company_patterns:
                                    company_match = re.search(company_pattern, text)
                                    if company_match:
                                        value = company_match.group(1).strip()
                                        print(f"  ✅ Found fallback contractor name: {value}")
                                        break
                                if not value or value.lower() in ['undefined', 'null', 'none', '']:
                                    value = 'Unknown Contractor'
                                    print(f"  ⚠️  Using default contractor name: {value}")
                        
                        tender_data[field] = value
                        print(f"  ✅ Extracted {field}: {value}")
                        break  # Found a match, move to next field
                    except (ValueError, TypeError) as e:
                        print(f"  ⚠️  Error converting {field}: {value} - {e}")
                        continue
        
        return tender_data
    
    def _parse_tender_tables(self, tables):
        """
        Parse tender information from tables
        """
        table_data = {}
        
        for table in tables:
            if table:
                for row in table:
                    if row and len(row) >= 2:
                        key = str(row[0]).strip().lower()
                        value = str(row[1]).strip()
                        
                        # Map table headers to our feature names
                        if 'contractor' in key and 'name' in key:
                            table_data['contractor_name'] = value
                        elif 'contract' in key and 'name' in key:
                            table_data['contract_name'] = value
                        elif 'license' in key and 'category' in key:
                            table_data['license_category'] = value
                        elif 'duration' in key:
                            duration_match = re.search(r'(\d+)', value)
                            if duration_match:
                                table_data['project_duration'] = int(duration_match.group(1))
                        elif 'warranty' in key:
                            warranty_match = re.search(r'(\d+)', value)
                            if warranty_match:
                                table_data['warranty_period'] = int(warranty_match.group(1))
                        elif 'rating' in key:
                            rating_match = re.search(r'(\d+(?:\.\d+)?)', value)
                            if rating_match:
                                table_data['client_rating'] = float(rating_match.group(1))
                        elif 'success' in key and 'rate' in key:
                            success_match = re.search(r'(\d+(?:\.\d+)?)', value)
                            if success_match:
                                table_data['project_success_rate'] = float(success_match.group(1))
                        elif 'rejection' in key:
                            rejection_match = re.search(r'(\d+)', value)
                            if rejection_match:
                                table_data['rejection_history'] = int(rejection_match.group(1))
                        elif 'safety' in key:
                            table_data['safety_certification'] = value
                        elif 'bid' in key and 'amount' in key:
                            bid_match = re.search(r'([\d,]+(?:\.\d+)?)', value)
                            if bid_match:
                                bid_amount = bid_match.group(1).replace(',', '')
                                table_data['bid_amount'] = float(bid_amount)
        
        return table_data

    def preprocess_data(self, data_list):
        """
        Preprocess extracted data for ML model - all parameters must be present
        """
        # Handle both DataFrame and list inputs
        if isinstance(data_list, pd.DataFrame):
            df = data_list.copy()
        else:
            if not data_list:
                print("No data to preprocess")
                return None, None
            df = pd.DataFrame(data_list)
        
        # Check if all required parameters are present and not None/empty
        required_parameters = [
            'contract_name', 'license_category', 
            'project_duration', 'warranty_period', 'client_rating',
            'project_success_rate', 'rejection_history', 'safety_certification',
            'bid_amount'
        ]
        
        missing_parameters = []
        for param in required_parameters:
            if param not in df.columns:
                missing_parameters.append(param)
            elif df[param].isna().all():
                missing_parameters.append(param)
            elif param in df.columns:
                # Check if all values are None, empty, or 'Unknown'
                all_values = df[param].astype(str).str.lower()
                if all_values.isin(['none', 'unknown', 'nan', '']).all():
                    missing_parameters.append(param)
        
        if missing_parameters:
            print(f"❌ Missing required parameters: {missing_parameters}")
            print("All parameters must be present in the PDF data.")
            print("Please ensure PDFs contain actual values for all parameters.")
            return None, None
        
        # Encode categorical variables
        categorical_features = ['contract_name', 'license_category', 'safety_certification']
        
        for feature in categorical_features:
            if feature in df.columns:
                le = LabelEncoder()
                df[f'{feature}_encoded'] = le.fit_transform(df[feature].astype(str))
                self.label_encoders[feature] = le
        
        # Create additional features
        df['bid_per_duration'] = df['bid_amount'] / df['project_duration']
        df['success_to_rating_ratio'] = df['project_success_rate'] / df['client_rating']
        df['warranty_to_duration_ratio'] = df['warranty_period'] / df['project_duration']
        
        # Select features for model
        feature_columns = [
            'project_duration', 'warranty_period', 'client_rating',
            'project_success_rate', 'rejection_history', 'bid_amount',
            'bid_per_duration', 'success_to_rating_ratio', 'warranty_to_duration_ratio'
        ]
        
        # Add encoded categorical features
        for feature in categorical_features:
            if f'{feature}_encoded' in df.columns:
                feature_columns.append(f'{feature}_encoded')
        
        return df[feature_columns], df
    
    def create_synthetic_data(self, num_samples=1000):
        """
        Create synthetic data for training the XGBoost model
        """
        np.random.seed(42)
        
        data = []
        for i in range(num_samples):
            # Generate realistic tender data
            contract_name = f"Contract_{i+1}"
            license_category = np.random.choice(['C1', 'C2', 'C3', 'C4', 'C5'])
            project_duration = np.random.randint(6, 60)  # 6-60 months
            warranty_period = np.random.randint(12, 120)  # 12-120 months
            client_rating = np.random.uniform(1.0, 5.0)  # 1-5 rating
            project_success_rate = np.random.uniform(60, 100)  # 60-100%
            rejection_history = np.random.randint(0, 5)  # 0-5 rejections
            safety_certification = np.random.choice(['Yes', 'No'])
            bid_amount = np.random.uniform(100000, 5000000)  # $100K to $5M
            
            data.append({
                'contract_name': contract_name,
                'license_category': license_category,
                'project_duration': project_duration,
                'warranty_period': warranty_period,
                'client_rating': client_rating,
                'project_success_rate': project_success_rate,
                'rejection_history': rejection_history,
                'safety_certification': safety_certification,
                'bid_amount': bid_amount
            })
        
        return data
    
    def create_target_variable(self, df):
        """
        Create target variable for winner prediction
        """
        # Create a scoring system to determine winners
        df['score'] = (
            df['client_rating'] * 0.25 +
            df['project_success_rate'] * 0.25 +
            (5 - df['rejection_history']) * 0.15 +
            (df['warranty_period'] / df['project_duration']) * 0.15 +
            (1 / df['bid_amount']) * 0.20  # Lower bid is better
        )
        
        # Determine winners (top 20% as winners)
        threshold = df['score'].quantile(0.8)
        df['winner'] = (df['score'] >= threshold).astype(int)
        
        return df
    
    def train_model(self, X, y):
        """
        Train XGBoost model with optimized hyperparameter tuning
        """
        print("\n🤖 Training XGBoost Model...")
        print("=" * 60)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Use optimized XGBoost model with faster training
        self.model = XGBClassifier(
            random_state=42,
            eval_metric='logloss',
            use_label_encoder=False,
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.9,
            colsample_bytree=0.9,
            n_jobs=1  # Use single thread for faster training
        )
        
        # Train model
        self.model.fit(X_scaled, y)
        
        # Make predictions
        y_pred = self.model.predict(X_scaled)
        y_pred_proba = self.model.predict_proba(X_scaled)[:, 1]
        
        # Print results
        print(f"Model trained on {len(X)} samples")
        print(f"Accuracy: {accuracy_score(y, y_pred):.4f}")
        if len(np.unique(y)) > 1:
            print(f"ROC AUC: {roc_auc_score(y, y_pred_proba):.4f}")
        print("\nClassification Report:")
        print(classification_report(y, y_pred))
        
        return X_scaled, y, y_pred, y_pred_proba

    def predict_winner(self, pdf_path):
        """
        Predict winner from PDF data
        """
        # Extract data from PDF
        extracted_data = self.extract_data_from_pdf(pdf_path)
        
        if not extracted_data:
            print("No data extracted from PDF")
            return None
        
        # Preprocess data
        X, df = self.preprocess_data([extracted_data])
        
        if self.model is None:
            print("Model not trained. Please train the model first.")
            return None
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        prediction_probas = self.model.predict_proba(X_scaled)[:, 1]
        
        # Add predictions to dataframe
        df['predicted_winner'] = predictions
        df['win_probability'] = prediction_probas
        
        return df
    
    def analyze_multiple_pdfs(self, pdf_files):
        """
        Analyze multiple PDFs and predict winners
        """
        print("🎯 COMPLETE TENDER PREDICTION SYSTEM")
        print("=" * 80)
        print("Evaluating ALL parameters:")
        print("✅ Contract Name ✅ License Category")
        print("✅ Project Duration ✅ Warranty Period ✅ Client Rating")
        print("✅ Project Success Rate ✅ Rejection History ✅ Safety Certification ✅ Bid Amount")
        print("=" * 80)
        
        all_data = []
        
        # Extract data from all PDFs
        for i, pdf_file in enumerate(pdf_files, 1):
            if not os.path.exists(pdf_file):
                print(f"❌ File {pdf_file} not found!")
                continue
            
            extracted_data = self.extract_data_from_pdf(pdf_file)
            
            if extracted_data:
                # Add PDF source
                extracted_data['pdf_source'] = pdf_file
                all_data.append(extracted_data)
                
                print(f" SUMMARY for {pdf_file}:")
                print(f" Contract: {extracted_data.get('contract_name', 'Unknown')}")
                print(f" License: {extracted_data.get('license_category', 'Unknown')}")
                print(f" Duration: {extracted_data.get('project_duration', 'Unknown')} months")
                print(f" Warranty: {extracted_data.get('warranty_period', 'Unknown')} months")
                print(f" Rating: {extracted_data.get('client_rating', 'Unknown')}/5.0")
                print(f" Success: {extracted_data.get('project_success_rate', 'Unknown')}%")
                print(f" Rejections: {extracted_data.get('rejection_history', 'Unknown')}")
                print(f" Safety: {extracted_data.get('safety_certification', 'Unknown')}")
                bid_amount = extracted_data.get('bid_amount', 'Unknown')
                if isinstance(bid_amount, (int, float)) and bid_amount != 'Unknown':
                    print(f" Bid: ${bid_amount:,.0f}")
                else:
                    print(f" Bid: {bid_amount}")
                print("-" * 60)
        
        if not all_data:
            print("\n❌ No data extracted from any PDF files!")
            return None
        
        # Preprocess all data
        X, df = self.preprocess_data(all_data)
        
        if X is None:
            print("❌ Failed to preprocess data - missing required parameters")
            print("Please ensure all PDFs contain all required parameters:")
            print("✅ Contract Name ✅ License Category")
            print("✅ Project Duration ✅ Warranty Period ✅ Client Rating")
            print("✅ Project Success Rate ✅ Rejection History ✅ Safety Certification ✅ Bid Amount")
            return None
        
        # Create target variable for scoring
        df = self.create_target_variable(df)
        
        # Train model if not already trained
        if self.model is None:
            # Create synthetic data for training
            print("\n🤖 Creating synthetic training data for XGBoost...")
            synthetic_data = self.create_synthetic_data(num_samples=1000)
            X_synthetic, df_synthetic = self.preprocess_data(synthetic_data)
            
            if X_synthetic is None:
                print("❌ Failed to preprocess synthetic data - missing required parameters")
                return None
                
            df_synthetic = self.create_target_variable(df_synthetic)
            y_synthetic = df_synthetic['winner']
            
            # Train XGBoost model
            self.train_model(X_synthetic, y_synthetic)
        
        # Make predictions on actual PDF data
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        prediction_probas = self.model.predict_proba(X_scaled)[:, 1]
        
        # Add predictions to dataframe
        df['predicted_winner'] = predictions
        df['win_probability'] = prediction_probas
        
        print("🎯 XGBoost predictions completed...")
        
        # Calculate comprehensive scores
        df['rating_score'] = df['client_rating'] / 5.0 * 100
        df['success_score'] = df['project_success_rate']
        max_bid = df['bid_amount'].max()
        df['bid_score'] = ((max_bid - df['bid_amount']) / max_bid) * 100
        df['comprehensive_score'] = (
            df['rating_score'] * 0.3 +
            df['success_score'] * 0.3 +
            df['bid_score'] * 0.4
        )
        
        # Sort by comprehensive score
        df = df.sort_values('comprehensive_score', ascending=False)
        df['rank'] = range(1, len(df) + 1)
        
        return df
    
    def display_results(self, df):
        """
        Display comprehensive results
        """
        print("\n🏆 FINAL TENDER RANKINGS")
        print("=" * 100)
        
        for i, (idx, row) in enumerate(df.iterrows(), 1):
            rank_emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "  "
            
            print(f"{rank_emoji} RANK #{i} - {row['pdf_source']}")
            print(f"   📄 Contract: {row.get('contract_name', 'Unknown')}")
            print(f"   🏗️  License: {row.get('license_category', 'Unknown')}")
            print(f"   ⏱️  Duration: {row.get('project_duration', 'Unknown')} months")
            print(f"   🛡️  Warranty: {row.get('warranty_period', 'Unknown')} months")
            # Handle numeric formatting with type checking
            rating = row.get('client_rating', 'Unknown')
            if isinstance(rating, (int, float)) and rating != 'Unknown':
                print(f"   ⭐ Rating: {rating:.1f}/5.0")
            else:
                print(f"   ⭐ Rating: {rating}/5.0")
            
            success = row.get('project_success_rate', 'Unknown')
            if isinstance(success, (int, float)) and success != 'Unknown':
                print(f"   📈 Success: {success:.1f}%")
            else:
                print(f"   📈 Success: {success}%")
            
            print(f"   ❌ Rejections: {row.get('rejection_history', 'Unknown')}")
            print(f"   🛡️  Safety: {row.get('safety_certification', 'Unknown')}")
            
            bid_amount = row.get('bid_amount', 'Unknown')
            if isinstance(bid_amount, (int, float)) and bid_amount != 'Unknown':
                print(f"   💰 Bid: ${bid_amount:,.0f}")
            else:
                print(f"   💰 Bid: {bid_amount}")
            print(f"   📊 Comprehensive Score: {row['comprehensive_score']:.2f}")
            print(f"   🤖 XGBoost Prediction: {'Winner' if row.get('predicted_winner', 0) == 1 else 'Not Winner'}")
            print(f"   🎯 Win Probability: {row.get('win_probability', 0):.2%}")
            print("-" * 80)
        
        # Show winner
        winner = df.iloc[0]
        print(f"\n🏆 WINNER ANNOUNCEMENT 🏆")
        print("=" * 80)
        print(f"🥇 BEST TENDER: {winner['pdf_source']}")
        print(f"   Source: {winner['pdf_source']}")
        
        # Handle winner bid amount formatting
        winner_bid = winner.get('bid_amount', 'Unknown')
        if isinstance(winner_bid, (int, float)) and winner_bid != 'Unknown':
            print(f"    Bid: ${winner_bid:,.0f}")
        else:
            print(f"    Bid: {winner_bid}")
        
        # Handle winner rating formatting
        winner_rating = winner.get('client_rating', 'Unknown')
        if isinstance(winner_rating, (int, float)) and winner_rating != 'Unknown':
            print(f"    Rating: {winner_rating:.1f}/5.0")
        else:
            print(f"    Rating: {winner_rating}/5.0")
        
        # Handle winner success rate formatting
        winner_success = winner.get('project_success_rate', 'Unknown')
        if isinstance(winner_success, (int, float)) and winner_success != 'Unknown':
            print(f"    Success: {winner_success:.1f}%")
        else:
            print(f"    Success: {winner_success}%")
        print(f"    Comprehensive Score: {winner['comprehensive_score']:.2f}")
        
        return df
    
    def plot_feature_importance(self):
        """
        Plot feature importance
        """
        if self.model is None:
            print("Model not trained")
            return
        
        feature_importance = self.model.feature_importances_
        
        # Handle feature names
        try:
            feature_names = self.model.feature_names_in_
        except AttributeError:
            feature_names = [f'Feature_{i}' for i in range(len(feature_importance))]
        
        # Create feature importance dataframe
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': feature_importance
        }).sort_values('importance', ascending=False)
        
        # Plot
        plt.figure(figsize=(10, 6))
        sns.barplot(data=importance_df.head(10), x='importance', y='feature')
        plt.title('Top 10 Feature Importance')
        plt.xlabel('Importance')
        plt.tight_layout()
        plt.show()
        
        return importance_df

    # Compatibility methods for existing API
    def process_database_data(self, db_data: List[Dict]) -> pd.DataFrame:
        """Process data from database records into a DataFrame - compatibility method."""
        all_data = []
        
        for record in db_data:
            processed_record = {}
            
            # Map API fields to expected fields
            field_mapping = {
                'contract_name': 'contract_name',
                'license_category': 'license_category',
                'project_duration': 'project_duration',
                'warranty_period': 'warranty_period',
                'client_rating': 'client_rating',
                'project_success_rate': 'project_success_rate',
                'rejection_history': 'rejection_history',
                'safety_certification': 'safety_certification',
                'bid_amount': 'bid_amount'
            }
            
            for api_field, expected_field in field_mapping.items():
                value = record.get(api_field)
                
                if value is not None:
                    if expected_field in ['bid_amount', 'project_success_rate']:
                        value = float(value)
                    elif expected_field in ['project_duration', 'warranty_period', 'rejection_history']:
                        value = int(value)
                    elif expected_field == 'client_rating':
                        value = float(value)
                    elif expected_field == 'safety_certification':
                        # Keep as string for now, will be converted in calculate_composite_score
                        value = str(value)
                
                processed_record[expected_field] = value
            
            # Handle missing values for required fields
            if 'contract_name' not in processed_record or not processed_record['contract_name']:
                processed_record['contract_name'] = f"Contract_{len(all_data)+1}"
            
            all_data.append(processed_record)
        
        df = pd.DataFrame(all_data)
        
        # Handle missing values
        for col in df.columns:
            if df[col].isnull().any():
                if col == 'license_category':
                    df[col] = df[col].fillna('C3')  # Default license category
                elif col in ['bid_amount', 'project_success_rate', 'client_rating']:
                    df[col] = df[col].fillna(df[col].median())
                elif col in ['project_duration', 'warranty_period', 'rejection_history']:
                    df[col] = df[col].fillna(df[col].median())
                elif col == 'safety_certification':
                    df[col] = df[col].fillna('No')
        
        return df

    def standardize_specialization(self, specialization: str) -> str:
        """Standardize specialization values to expected categories - compatibility method."""
        if not isinstance(specialization, str):
            return 'Others'
            
        specialization = specialization.strip().title()
        if 'road' in specialization.lower():
            return 'Road Construction'
        elif 'build' in specialization.lower():
            return 'Building'
        elif 'bridge' in specialization.lower():
            return 'Bridge'
        elif 'infra' in specialization.lower():
            return 'Infrastructure'
        return 'Others'

    def calculate_composite_score(self, df: pd.DataFrame) -> np.ndarray:
        """Calculate balanced composite score with equal parameter weighting - compatibility method."""
        normalized_scores = pd.DataFrame()
        
        # Normalize each parameter to 0-100 scale
        params_to_normalize = {
            'bid_amount': False,  # Lower is better
            'project_duration': False,  # Lower is better
            'warranty_period': True,  # Higher is better
            'client_rating': True,  # Higher is better
            'project_success_rate': True,  # Higher is better
            'rejection_history': False,  # Lower is better
            'safety_certification': True  # Higher is better
        }
        
        for param, higher_better in params_to_normalize.items():
            if param in df.columns:
                # Convert safety_certification to numeric if it's string
                if param == 'safety_certification' and df[param].dtype == 'object':
                    param_data = (df[param] == 'Yes').astype(int)
                else:
                    param_data = pd.to_numeric(df[param], errors='coerce')
                
                # Skip if all values are NaN
                if param_data.isna().all():
                    continue
                    
                min_val = param_data.min()
                max_val = param_data.max()
                
                if higher_better:
                    normalized_scores[f'{param}_score'] = 100 * (param_data - min_val) / (max_val - min_val) if max_val != min_val else 50
                else:
                    normalized_scores[f'{param}_score'] = 100 * (max_val - param_data) / (max_val - min_val) if max_val != min_val else 50
        
        # Equal weighting of all parameters
        composite_score = normalized_scores.mean(axis=1)
        return composite_score.values

    def create_sample_data(self) -> pd.DataFrame:
        """Generate sample training data - compatibility method."""
        np.random.seed(42)
        data = {
            'contract_name': [f'Contract_{i}' for i in range(1, 201)],
            'license_category': np.random.choice(['C1', 'C2', 'C3', 'C4', 'C5'], 200),
            'project_duration': np.random.randint(6, 60, 200),
            'warranty_period': np.random.randint(12, 120, 200),
            'client_rating': np.random.uniform(1.0, 5.0, 200),
            'project_success_rate': np.random.uniform(60, 100, 200),
            'rejection_history': np.random.randint(0, 5, 200),
            'safety_certification': np.random.choice(['Yes', 'No'], 200),
            'bid_amount': np.random.uniform(100000, 5000000, 200)
        }
        return pd.DataFrame(data)

    def initialize_model(self):
        """Initialize the model with sample data if not already trained - compatibility method."""
        if self.model is None:
            print("Initializing model with sample data...")
            train_data = self.create_sample_data()
            processed_data, full_df = self.preprocess_data(train_data)
            
            if processed_data is None:
                print("Failed to preprocess data")
                return
                
            X = processed_data
            y = (self.calculate_composite_score(train_data) >= np.percentile(
                self.calculate_composite_score(train_data), 70)).astype(int)
            self.train_model(X, y)
            print("Model initialized successfully.")

    def run_prediction_pipeline(self, db_data: List[Dict]):
        """Complete pipeline from database data to winner prediction - compatibility method."""
        self.initialize_model()
        
        print("\nProcessing data from database...")
        tender_data = self.process_database_data(db_data)
        
        print("\nAnalyzing and ranking bidders...")
        results = self.predict_from_dataframe(tender_data)
        
        if results is None or results.empty:
            print("No results to display")
            return pd.DataFrame()
        
        print("\n=== FINAL RANKING ===")
        print(results[['rank', 'contractor_name', 'composite_score', 'win_probability', 
                     'bid_amount', 'technical_merit']].to_string(index=False))
        
        winner = results.iloc[0]
        print(f"\n🏆 Winner: {winner['contractor_name']}")
        print(f"📊 Composite Score: {winner['composite_score']:.2f}")
        print(f"🎯 Win Probability: {winner['win_probability']:.2%}")
        print(f"💰 Bid Amount: {winner['bid_amount']:,.2f}")
        print(f"🛠 Technical Merit: {winner['technical_merit']:.2f}")
        
        # For API usage, you can save the plot if needed or show it conditionally
        self.plot_comparison(results, show_plot=False)
        
        return results

    def predict_from_dataframe(self, df: pd.DataFrame):
        """Predict winner from DataFrame data - compatibility method."""
        if df.empty:
            print("No data to predict")
            return None
        
        # Preprocess data
        processed_data, full_df = self.preprocess_data(df)
        
        if processed_data is None:
            print("Failed to preprocess data")
            return None
        
        if self.model is None:
            print("Model not trained. Please train the model first.")
            return None
        
        # Scale features
        X_scaled = self.scaler.transform(processed_data)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        prediction_probas = self.model.predict_proba(X_scaled)[:, 1]
        
        # Calculate composite scores
        composite_scores = self.calculate_composite_score(df)
        
        # Create results DataFrame
        results = df.copy()
        results['predicted_winner'] = predictions
        results['win_probability'] = prediction_probas
        results['composite_score'] = composite_scores
        results['technical_merit'] = composite_scores  # Using composite score as technical merit
        
        # Add contractor names if not present
        if 'contractor_name' not in results.columns:
            results['contractor_name'] = results['contract_name']
        
        # Rank by composite score (higher is better)
        results = results.sort_values('composite_score', ascending=False)
        results['rank'] = range(1, len(results) + 1)
        
        return results

    def plot_comparison(self, results: pd.DataFrame, show_plot=True, save_path=None):
        """Visual comparison of all bidders with contractor names - compatibility method."""
        
        metrics = ['composite_score', 'technical_merit']
        normalized = results[['contractor_name'] + metrics].copy()
        normalized[metrics] = normalized[metrics].apply(lambda x: (x - x.min()) / (x.max() - x.min()) * 100)
        
        angles = np.linspace(0, 2 * np.pi, len(metrics), endpoint=False).tolist()
        angles += angles[:1]
        
        fig, ax = plt.subplots(figsize=(8, 8), subplot_kw={'polar': True})
        
        for idx, row in normalized.iterrows():
            values = row[metrics].tolist()
            values += values[:1]
            ax.plot(angles, values, 'o-', linewidth=2, label=row['contractor_name'])
            ax.fill(angles, values, alpha=0.1)
        
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(metrics)
        ax.set_title('Contractor Comparison (Normalized Scores)', size=14, pad=20)
        ax.legend(bbox_to_anchor=(1.3, 1.1))
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path)
        if show_plot:
            plt.show()
        plt.close()
