from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

DAY_TO_INDEX = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}


@dataclass
class BookingRecommender:
    n_clusters: int = 6
    random_state: int = 42
    kmeans: KMeans = field(init=False)
    scaler: StandardScaler = field(init=False)
    trained_data: pd.DataFrame = field(default_factory=pd.DataFrame, init=False)
    global_slot_rank: List[str] = field(default_factory=list, init=False)
    is_fitted: bool = field(default=False, init=False)

    def __post_init__(self) -> None:
        self.kmeans = KMeans(
            n_clusters=self.n_clusters,
            random_state=self.random_state,
            n_init=10,
            init="random",
            algorithm="lloyd",
        )
        self.scaler = StandardScaler()

    def _prepare_features(self, dataset: pd.DataFrame) -> pd.DataFrame:
        prepared = dataset.copy()
        prepared["day_index"] = prepared["day_of_week"].map(DAY_TO_INDEX).fillna(0).astype(int)
        prepared["time_hour"] = prepared["time_slot"].str.slice(0, 2).astype(int)
        return prepared

    def fit(self, dataset: pd.DataFrame) -> None:
        if dataset.empty:
            raise ValueError("Cannot train recommendation model: dataset is empty")

        prepared = self._prepare_features(dataset)
        features = prepared[["court_id", "day_index", "time_hour"]].astype(float)
        scaled_features = self.scaler.fit_transform(features)

        self.kmeans.fit(scaled_features)
        prepared["cluster_id"] = self.kmeans.predict(scaled_features)

        self.trained_data = prepared
        self.global_slot_rank = prepared["time_slot"].value_counts().index.tolist()
        self.is_fitted = True

    def recommend_best_time(self, user_id: int, top_n: int = 3) -> List[str]:
        if not self.is_fitted:
            raise RuntimeError("Recommendation model is not trained")

        if top_n <= 0:
            raise ValueError("top_n must be greater than 0")

        user_data = self.trained_data[self.trained_data["user_id"] == user_id]

        if user_data.empty:
            return self.global_slot_rank[:top_n]

        # 1) Preferred slots from user booking history
        preferred_slots = user_data["time_slot"].value_counts().index.tolist()

        # 2) Preferred play hours (hour-level behavior)
        preferred_hours = user_data["time_hour"].value_counts().index.tolist()
        preferred_hour_slots = [f"{hour:02d}:00" for hour in preferred_hours]

        # 3) Cluster-based neighborhood recommendation
        dominant_cluster = int(user_data["cluster_id"].mode().iloc[0])
        cluster_data = self.trained_data[self.trained_data["cluster_id"] == dominant_cluster]
        cluster_slots = cluster_data["time_slot"].value_counts().index.tolist()

        # 4) Merge candidates with deterministic fallback
        ordered_candidates: List[str] = []
        for slot in preferred_slots + preferred_hour_slots + cluster_slots + self.global_slot_rank:
            if slot not in ordered_candidates:
                ordered_candidates.append(slot)

        return ordered_candidates[:top_n]
