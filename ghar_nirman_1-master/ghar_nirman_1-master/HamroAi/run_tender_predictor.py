#!/usr/bin/env python3
"""
Python wrapper script for tender prediction AI model
Called by Node.js backend to analyze PDF files
"""

import sys
import json
import traceback
import io
import contextlib
import os

# Set UTF-8 encoding for stdout and stderr to handle emojis
import codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from tender_predictor import TenderPredictor
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Failed to import tender_predictor: {e}",
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python run_tender_predictor.py <command> <pdf_path>",
            "usage": "Commands: analyze"
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    pdf_path = sys.argv[2]
    
    if command == "analyze":
        try:
            # Create a custom stdout that redirects ALL output to stderr for debug messages
            class DebugRedirect:
                def __init__(self):
                    pass
                
                def write(self, text):
                    if text.strip():  # Only redirect non-empty lines
                        # Write to stderr only - this will be captured by Node.js
                        sys.stderr.write(text)
                        sys.stderr.flush()
                
                def flush(self):
                    sys.stderr.flush()
            
            # Store original stdout
            original_stdout = sys.stdout
            
            try:
                # Redirect stdout to stderr for all debug output
                sys.stdout = DebugRedirect()
                
                predictor = TenderPredictor()
                result = predictor.extract_data_from_pdf(pdf_path)
                
            finally:
                # Restore original stdout
                sys.stdout = original_stdout
            
            # Fill in missing required parameters with default values
            required_params = [
                'contract_name', 'license_category', 'project_duration', 
                'warranty_period', 'client_rating', 'project_success_rate', 
                'rejection_history', 'safety_certification', 'bid_amount'
            ]
            
            for param in required_params:
                if param not in result or result[param] is None:
                    if param == 'contract_name':
                        result[param] = 'Default Contract'
                    elif param == 'license_category':
                        result[param] = 'A'
                    elif param == 'project_duration':
                        result[param] = 12
                    elif param == 'warranty_period':
                        result[param] = 24
                    elif param == 'client_rating':
                        result[param] = 4.0
                    elif param == 'project_success_rate':
                        result[param] = 85.0
                    elif param == 'rejection_history':
                        result[param] = 0
                    elif param == 'safety_certification':
                        result[param] = 'Yes'
                    elif param == 'bid_amount':
                        result[param] = 1000000.0
            
            # Output results as JSON to stdout (clean output)
            print(json.dumps({"success": True, "data": result}))
            
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
                "pdf_path": pdf_path,
                "script_dir": os.getcwd()
            }))
    else:
        print(json.dumps({
            "success": False,
            "error": f"Unknown command: {command}",
            "usage": "Commands: analyze"
        }))

if __name__ == "__main__":
    main() 