from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.services.recommendation_service import RecommendationService

app = FastAPI(
    title="Smart Badminton AI Service",
    version="1.0.0",
    description="Recommendation microservice for badminton booking time slots.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASET_PATH = Path(__file__).resolve().parent / "app" / "dataset" / "booking_history.csv"
recommendation_service = RecommendationService(dataset_path=DATASET_PATH)


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "service": "ai-recommendation",
        "dataset_path": str(DATASET_PATH),
    }


@app.get("/ai/recommendation/{user_id}")
def get_recommendation(user_id: int) -> dict:
    try:
        recommended_slots = recommendation_service.recommend_best_time(user_id=user_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return {"recommended_slots": recommended_slots}
