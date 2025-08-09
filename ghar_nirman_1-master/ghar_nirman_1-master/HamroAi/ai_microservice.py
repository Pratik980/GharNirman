import os
import shutil
import traceback
import uuid
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import joblib
import numpy as np
import uvicorn

from HamroAi.tender_predictor import TenderPredictor  # Your PDF feature extractor

# Load the saved model, scaler, and kmeans
model = joblib.load("HamroAi/xgboost_model.pkl")
scaler = joblib.load("HamroAi/scaler.pkl")
kmeans = joblib.load("HamroAi/kmeans.pkl")

app = FastAPI(title="Tender AI Prediction Microservice")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input schema for prediction endpoint
class TenderData(BaseModel):
    Tender_Amount: float
    Awarded_Amount: float
    award_delay_days: float
    Award_Year: int
    Award_Month: int
    Tender_to_Award_Ratio: float
    Agency_encoded: float
    Supplier_Name_encoded: float

@app.get("/")
def read_root():
    return {"message": "🎯 AI Microservice for Tender Award Prediction is running."}

# Prediction endpoint - note path updated to /predict (no /api)
@app.post("/predict")
def predict(data: TenderData):
    try:
        input_array = np.array([[ 
            data.Tender_Amount,
            data.Awarded_Amount,
            data.award_delay_days,
            data.Award_Year,
            data.Award_Month,
            data.Tender_to_Award_Ratio,
            data.Agency_encoded,
            data.Supplier_Name_encoded
        ]])
        input_scaled = scaler.transform(input_array)
        cluster = kmeans.predict(input_scaled)[0]
        prediction = model.predict(input_scaled)[0]
        prediction_label = "✅ Awarded" if prediction == 1 else "❌ Not Awarded"

        return {
            "prediction": int(prediction),
            "prediction_label": prediction_label,
            "cluster": int(cluster)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/tenders")
async def create_tender(
    title: str = Form(...),
    description: str = Form(...),
    deadline: str = Form(...),
    budget: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    projectDuration: str = Form(...),
    requirements: str = Form(...),
    documents: UploadFile = File(None),
    drawings: UploadFile = File(None)
):
    saved_files = {}
    upload_dir = "uploaded_files"
    os.makedirs(upload_dir, exist_ok=True)

    try:
        # Save uploaded documents with unique filenames
        if documents:
            unique_doc_filename = f"{uuid.uuid4()}_{documents.filename}"
            doc_path = os.path.join(upload_dir, unique_doc_filename)
            with open(doc_path, "wb") as buffer:
                shutil.copyfileobj(documents.file, buffer)
            saved_files['documents'] = doc_path

        if drawings:
            unique_draw_filename = f"{uuid.uuid4()}_{drawings.filename}"
            draw_path = os.path.join(upload_dir, unique_draw_filename)
            with open(draw_path, "wb") as buffer:
                shutil.copyfileobj(drawings.file, buffer)
            saved_files['drawings'] = draw_path

        # Extract features from PDF document if uploaded
        extracted_features = None
        if 'documents' in saved_files:
            predictor = TenderPredictor()
            extracted_features = predictor.extract_data_from_pdf(saved_files['documents'])
            if not extracted_features:
                extracted_features = {"error": "Failed to extract features from PDF."}

        # Dummy ID - you can replace this with real DB-generated ID later
        tender_id = 123

        return JSONResponse(content={
            "id": tender_id,
            "title": title,
            "description": description,
            "deadline": deadline,
            "budget": budget,
            "category": category,
            "location": location,
            "projectDuration": projectDuration,
            "requirements": requirements,
            "documents": saved_files.get('documents'),
            "drawings": saved_files.get('drawings'),
            "extracted_features": extracted_features,
            "status": "open",
            "bids": 0,
            "lastUpdated": deadline
        })

    except Exception as e:
        print("❌ Error in create_tender:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to process tender and extract features.")

if __name__ == "__main__":
    uvicorn.run("HamroAi.ai_microservice:app", host="0.0.0.0", port=5001, reload=True)
