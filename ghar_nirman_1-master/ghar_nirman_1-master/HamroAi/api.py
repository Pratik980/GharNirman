from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from HamroAi.tender_predictor import TenderPredictor  # Make sure this path is correct

app = FastAPI()

# Mount static folder (adjust path if needed)
app.mount("/static", StaticFiles(directory="HamroAi/static"), name="static")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize predictor
predictor = TenderPredictor()
predictor.initialize_model()

# Request model
class TenderBid(BaseModel):
    contract_name: str
    license_category: str
    project_duration: int
    warranty_period: int
    client_rating: float
    project_success_rate: float
    rejection_history: int
    safety_certification: str
    bid_amount: float

@app.post("/analyze")
async def analyze_bids(bids: List[TenderBid]):
    bids_dict = [bid.dict() for bid in bids]
    results_df = predictor.run_prediction_pipeline(bids_dict)
    return results_df.to_dict(orient='records')

@app.post("/plot")
async def generate_plot(bids: List[TenderBid]):
    bids_dict = [bid.dict() for bid in bids]
    results = predictor.run_prediction_pipeline(bids_dict)
    # Save plot image to static folder
    predictor.plot_comparison(results, save_path="HamroAi/static/plot.png")
    return {"message": "Plot generated", "plot_url": "/static/plot.png"}
