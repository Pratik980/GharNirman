import sys
import json
import os
import traceback
from pathlib import Path

# Add the HamroAi directory to Python path
current_dir = Path(__file__).parent
# Based on our directory structure: tender-evaluation-backend/tender-evaluation-backend/ -> ghar_nirman_1-master/ghar_nirman_1-master/HamroAi
hamro_ai_path = current_dir.parent.parent / "ghar_nirman_1-master" / "ghar_nirman_1-master" / "HamroAi"
import sys
sys.stderr.write(f"Looking for HamroAi at: {hamro_ai_path}\n")
sys.stderr.write(f"HamroAi exists: {hamro_ai_path.exists()}\n")
if not hamro_ai_path.exists():
    # Try alternative path
    hamro_ai_path = current_dir.parent.parent.parent / "ghar_nirman_1-master" / "ghar_nirman_1-master" / "HamroAi"
    sys.stderr.write(f"Trying alternative path: {hamro_ai_path}\n")
    sys.stderr.write(f"Alternative path exists: {hamro_ai_path.exists()}\n")
if not hamro_ai_path.exists():
    # Try the correct path based on our directory structure
    hamro_ai_path = current_dir.parent.parent / "ghar_nirman_1-master" / "ghar_nirman_1-master" / "HamroAi"
    sys.stderr.write(f"Trying correct path: {hamro_ai_path}\n")
    sys.stderr.write(f"Correct path exists: {hamro_ai_path.exists()}\n")
if not hamro_ai_path.exists():
    # Try absolute path
    hamro_ai_path = Path("C:/Users/acer/OneDrive - Taylor's Higher Education/Desktop/ghar_nirman_1-master finalllllllllll/ghar_nirman_1-masterssss/ghar_nirman_1-master/ghar_nirman_1-master/HamroAi")
    sys.stderr.write(f"Trying absolute path: {hamro_ai_path}\n")
    sys.stderr.write(f"Absolute path exists: {hamro_ai_path.exists()}\n")
sys.path.append(str(hamro_ai_path))

try:
    from tender_predictor import TenderPredictor
except ImportError as e:
    sys.stderr.write(f"ERROR: Could not import TenderPredictor: {str(e)}\n")
    sys.stderr.write(f"Looking for HamroAi at: {hamro_ai_path}\n")
    sys.exit(1)

def extract_tender_data(pdf_path):
    """
    Extract comprehensive tender data using the advanced TenderPredictor system
    """
    try:
        # Initialize the predictor
        predictor = TenderPredictor()
        
        # Extract data from PDF
        extracted_data = predictor.extract_data_from_pdf(pdf_path)
        
        if not extracted_data:
            return {
                "success": False,
                "error": "No data extracted from PDF",
                "data": {}
            }
        
        # Fill in missing parameters with default values
        required_params = [
            'contract_name', 'license_category', 'project_duration', 'warranty_period',
            'client_rating', 'project_success_rate', 'rejection_history', 
            'safety_certification', 'bid_amount'
        ]
        
        for param in required_params:
            if param not in extracted_data or extracted_data[param] is None:
                if param == 'contract_name':
                    extracted_data[param] = "Unknown Contractor"
                elif param == 'license_category':
                    extracted_data[param] = "C"
                elif param == 'project_duration':
                    extracted_data[param] = 12
                elif param == 'warranty_period':
                    extracted_data[param] = 24
                elif param == 'client_rating':
                    extracted_data[param] = 3
                elif param == 'project_success_rate':
                    extracted_data[param] = 80.0
                elif param == 'rejection_history':
                    extracted_data[param] = 0
                elif param == 'safety_certification':
                    extracted_data[param] = "No"
                elif param == 'bid_amount':
                    extracted_data[param] = 100000.0
                sys.stderr.write(f"  ⚠️  Using default value for {param}: {extracted_data[param]}\n")
        
        # Preprocess the data for ML model
        processed_data = predictor.preprocess_data([extracted_data])
        
        # Make prediction if model is available
        prediction_result = None
        try:
            if hasattr(predictor, 'model') and predictor.model is not None:
                # Get prediction probability
                prediction_result = predictor.predict_winner(pdf_path)
        except Exception as pred_error:
            sys.stderr.write(f"Warning: Prediction failed: {str(pred_error)}\n")
        
        # Convert processed_data to dictionary if it's a DataFrame
        processed_data_dict = {}
        if processed_data and len(processed_data) > 0:
            if hasattr(processed_data[0], 'to_dict'):
                processed_data_dict = processed_data[0].to_dict()
            else:
                processed_data_dict = processed_data[0]
        
        return {
            "success": True,
            "data": extracted_data,
            "processed_data": processed_data_dict,
            "prediction": prediction_result,
            "message": "Data extracted successfully using advanced AI system"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "data": {}
        }

def analyze_multiple_pdfs(pdf_paths):
    """
    Analyze multiple PDFs and provide comprehensive comparison
    """
    try:
        predictor = TenderPredictor()
        
        # Analyze multiple PDFs
        results = predictor.analyze_multiple_pdfs(pdf_paths)
        
        return {
            "success": True,
            "results": results.to_dict(orient='records') if hasattr(results, 'to_dict') else results,
            "message": "Multiple PDFs analyzed successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.stderr.write("ERROR: Usage: python extract_pdf_text.py <command> <pdf_path> [pdf_path2] ...\n")
        sys.stderr.write("Commands: extract, analyze\n")
        sys.exit(1)
    
    command = sys.argv[1]
    pdf_paths = sys.argv[2:]
    
    if command == "extract":
        if len(pdf_paths) != 1:
            sys.stderr.write("ERROR: extract command requires exactly one PDF path\n")
            sys.exit(1)
        
        result = extract_tender_data(pdf_paths[0])
        print(json.dumps(result, indent=2))
        
    elif command == "analyze":
        if len(pdf_paths) < 1:
            sys.stderr.write("ERROR: analyze command requires at least one PDF path\n")
            sys.exit(1)
        
        result = analyze_multiple_pdfs(pdf_paths)
        print(json.dumps(result, indent=2))
        
    else:
        sys.stderr.write(f"ERROR: Unknown command '{command}'. Use 'extract' or 'analyze'\n")
        sys.exit(1)
