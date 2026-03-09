from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.models.recommendation_model import BookingRecommender

REQUIRED_COLUMNS = ["user_id", "court_id", "day_of_week", "time_slot"]


class RecommendationService:
    def __init__(self, dataset_path: Path) -> None:
        self.dataset_path = dataset_path
        self.model = BookingRecommender()
        self._initialize_model()

    def _initialize_model(self) -> None:
        if not self.dataset_path.exists():
            raise RuntimeError(f"Dataset not found: {self.dataset_path}")

        dataset = pd.read_csv(self.dataset_path)
        missing = [column for column in REQUIRED_COLUMNS if column not in dataset.columns]
        if missing:
            raise RuntimeError(f"Dataset missing required columns: {missing}")

        clean_dataset = dataset[REQUIRED_COLUMNS].dropna().copy()
        clean_dataset["user_id"] = clean_dataset["user_id"].astype(int)
        clean_dataset["court_id"] = clean_dataset["court_id"].astype(int)
        clean_dataset["day_of_week"] = clean_dataset["day_of_week"].astype(str)
        clean_dataset["time_slot"] = clean_dataset["time_slot"].astype(str)

        self.model.fit(clean_dataset)

    def recommend_best_time(self, user_id: int) -> list[str]:
        if user_id <= 0:
            raise ValueError("user_id must be a positive integer")
        return self.model.recommend_best_time(user_id=user_id, top_n=3)
