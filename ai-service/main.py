from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.admin_insight_service import AdminInsightService
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
admin_insight_service = AdminInsightService()


class RecommendationUser(BaseModel):
    id: int = Field(gt=0)


class RecommendationSlot(BaseModel):
    courtId: int = Field(gt=0)
    courtName: str
    location: str = ""
    slotId: int = Field(gt=0)
    startTime: str
    endTime: str
    priceVnd: float = Field(ge=0)


class RecommendationHistoryItem(BaseModel):
    bookingDate: str
    dayOfWeek: str | None = None
    courtId: int = Field(gt=0)
    courtName: str | None = None
    startTime: str
    endTime: str
    priceVnd: float = Field(ge=0)


class RecommendationScoreRequest(BaseModel):
    user: RecommendationUser
    targetDate: str
    availableSlots: list[RecommendationSlot]
    history: list[RecommendationHistoryItem] = []


class AdminOverviewStats(BaseModel):
    totalRevenueVnd: float = Field(ge=0)
    totalBookings: int = Field(ge=0)
    activeUsers: int = Field(ge=0)
    avgUtilizationPercent: float = Field(ge=0)


class RevenuePoint(BaseModel):
    date: str
    revenueVnd: float = Field(ge=0)


class PeakHourPoint(BaseModel):
    hour: int = Field(ge=0, le=23)
    bookingCount: int = Field(ge=0)


class UtilizationCourtPoint(BaseModel):
    courtId: int = Field(gt=0)
    courtName: str
    utilizationPercent: float = Field(ge=0)
    confirmedSlots: int = Field(ge=0)
    totalAvailableSlots: int = Field(ge=0)


class AlertItem(BaseModel):
    type: str
    severity: str
    title: str
    message: str


class RevenueTrend(BaseModel):
    direction: str
    currentWindowRevenueVnd: float = Field(ge=0)
    previousWindowRevenueVnd: float = Field(ge=0)
    changePercent: float


class AdminInsightRequest(BaseModel):
    stats: AdminOverviewStats
    revenueSeries: list[RevenuePoint] = []
    peakHours: list[PeakHourPoint] = []
    utilizationByCourt: list[UtilizationCourtPoint] = []
    alerts: list[AlertItem] = []
    revenueTrend: RevenueTrend


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


@app.post("/ai/recommendations/score")
def score_recommendations(payload: RecommendationScoreRequest) -> dict:
    try:
        return recommendation_service.score_recommendations(payload.model_dump())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/ai/admin-insights")
def get_admin_insights(payload: AdminInsightRequest) -> dict:
    try:
        return admin_insight_service.generate(payload.model_dump())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
