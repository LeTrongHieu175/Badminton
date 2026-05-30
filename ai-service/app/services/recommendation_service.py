from __future__ import annotations

from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from app.models.recommendation_model import BookingRecommender

REQUIRED_COLUMNS = ["user_id", "court_id", "day_of_week", "time_slot"]
MAX_RECOMMENDATIONS = 3


def _normalize_time(value: Any) -> str:
    raw = str(value or "").strip()
    if len(raw) >= 5:
        return raw[:5]
    return raw


def _build_time_label(start_time: str, end_time: str) -> str:
    return f"{_normalize_time(start_time)} - {_normalize_time(end_time)}"


def _build_time_key(start_time: str, end_time: str) -> str:
    return f"{_normalize_time(start_time)}|{_normalize_time(end_time)}"


def _build_court_time_key(court_id: int, start_time: str, end_time: str) -> str:
    return f"{int(court_id)}|{_build_time_key(start_time, end_time)}"


def _normalized_counter_value(counter: Counter, key: Any) -> float:
    if not counter:
        return 0.0

    max_value = max(counter.values())
    if max_value <= 0:
        return 0.0

    return counter.get(key, 0) / max_value


def _clamp_score(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _get_day_of_week(date_string: str) -> str:
    return datetime.strptime(date_string, "%Y-%m-%d").strftime("%A")


def _score_prime_time(start_time: str) -> float:
    try:
        hour = int(_normalize_time(start_time)[:2])
    except ValueError:
        return 0.4

    return _clamp_score(1 - min(abs(hour - 19) / 12, 1))


class RecommendationService:
    def __init__(self, dataset_path: Path) -> None:
        self.dataset_path = dataset_path
        self.model = BookingRecommender()
        self.global_time_counts: Counter[str] = Counter()
        self.global_day_time_counts: Counter[tuple[str, str]] = Counter()
        self.global_court_time_counts: Counter[tuple[int, str]] = Counter()
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
        clean_dataset["time_slot"] = clean_dataset["time_slot"].astype(str).map(_normalize_time)

        self.model.fit(clean_dataset)
        self.global_time_counts = Counter(clean_dataset["time_slot"].tolist())
        self.global_day_time_counts = Counter(zip(clean_dataset["day_of_week"], clean_dataset["time_slot"]))
        self.global_court_time_counts = Counter(zip(clean_dataset["court_id"], clean_dataset["time_slot"]))

    def recommend_best_time(self, user_id: int) -> list[str]:
        if user_id <= 0:
            raise ValueError("user_id must be a positive integer")
        return self.model.recommend_best_time(user_id=user_id, top_n=MAX_RECOMMENDATIONS)

    def score_recommendations(self, payload: dict[str, Any]) -> dict[str, Any]:
        available_slots = [self._normalize_slot(slot) for slot in payload.get("availableSlots", [])]
        history = [self._normalize_history(item) for item in payload.get("history", [])]

        if not available_slots:
            return {
                "strategy": "empty",
                "recommendedOptions": [],
            }

        target_date = str(payload.get("targetDate") or "").strip()
        target_day = _get_day_of_week(target_date)
        history_stats = self._build_history_stats(history)
        has_history = bool(history)

        ranked_options = [
            self._score_slot(
                slot=slot,
                available_slots=available_slots,
                history_stats=history_stats,
                target_day=target_day,
                has_history=has_history,
            )
            for slot in available_slots
        ]

        ranked_options.sort(
            key=lambda item: (-item["score"], item["priceVnd"], item["courtName"], item["startTime"])
        )

        return {
            "strategy": "personalized" if has_history else "cold_start",
            "recommendedOptions": ranked_options[:MAX_RECOMMENDATIONS],
        }

    def _normalize_slot(self, slot: dict[str, Any]) -> dict[str, Any]:
        return {
            "courtId": int(slot["courtId"]),
            "courtName": str(slot.get("courtName") or "Sân"),
            "location": str(slot.get("location") or ""),
            "slotId": int(slot["slotId"]),
            "label": _build_time_label(slot.get("startTime"), slot.get("endTime")),
            "startTime": _normalize_time(slot.get("startTime")),
            "endTime": _normalize_time(slot.get("endTime")),
            "priceVnd": float(slot.get("priceVnd") or 0),
        }

    def _normalize_history(self, item: dict[str, Any]) -> dict[str, Any]:
        booking_date = str(item.get("bookingDate") or "").strip()
        day_of_week = str(item.get("dayOfWeek") or "").strip()
        if not day_of_week and booking_date:
            day_of_week = _get_day_of_week(booking_date)

        return {
            "bookingDate": booking_date,
            "dayOfWeek": day_of_week,
            "courtId": int(item["courtId"]),
            "courtName": str(item.get("courtName") or "Sân"),
            "startTime": _normalize_time(item.get("startTime")),
            "endTime": _normalize_time(item.get("endTime")),
            "priceVnd": float(item.get("priceVnd") or 0),
        }

    def _build_history_stats(self, history: list[dict[str, Any]]) -> dict[str, Any]:
        court_time_counts: Counter[str] = Counter()
        court_counts: Counter[int] = Counter()
        time_counts: Counter[str] = Counter()
        day_counts: Counter[str] = Counter()
        prices: list[float] = []

        for item in history:
            court_time_counts[_build_court_time_key(item["courtId"], item["startTime"], item["endTime"])] += 1
            court_counts[item["courtId"]] += 1
            time_counts[_build_time_key(item["startTime"], item["endTime"])] += 1
            day_counts[item["dayOfWeek"]] += 1
            prices.append(float(item["priceVnd"]))

        average_price = sum(prices) / len(prices) if prices else None
        return {
            "court_time_counts": court_time_counts,
            "court_counts": court_counts,
            "time_counts": time_counts,
            "day_counts": day_counts,
            "average_price": average_price,
        }

    def _score_price_fit(
        self,
        price_vnd: float,
        average_price: float | None,
        available_slots: list[dict[str, Any]],
    ) -> float:
        if average_price and average_price > 0:
            return _clamp_score(1 - min(abs(price_vnd - average_price) / average_price, 1))

        prices = [float(slot["priceVnd"]) for slot in available_slots]
        max_price = max(prices)
        min_price = min(prices)
        if max_price == min_price:
            return 0.7

        return _clamp_score(1 - (price_vnd - min_price) / (max_price - min_price))

    def _score_global_signal(self, slot: dict[str, Any], target_day: str) -> float:
        start_time = slot["startTime"]
        court_id = int(slot["courtId"])
        time_score = _normalized_counter_value(self.global_time_counts, start_time)
        day_time_score = _normalized_counter_value(self.global_day_time_counts, (target_day, start_time))
        court_time_score = _normalized_counter_value(self.global_court_time_counts, (court_id, start_time))
        return (time_score + day_time_score + court_time_score) / 3

    def _build_reason(
        self,
        slot: dict[str, Any],
        *,
        has_history: bool,
        court_time_score: float,
        court_score: float,
        time_score: float,
        day_score: float,
        price_score: float,
    ) -> str:
        if court_time_score >= 0.6:
            return f"Bạn thường chơi {slot['courtName']} trong khung giờ {slot['label']}."

        if court_score >= 0.65 and time_score >= 0.45:
            return (
                f"{slot['courtName']} là sân bạn đặt thường xuyên và khung giờ "
                f"{slot['label']} khá sát với thói quen hiện tại."
            )

        if time_score >= 0.65:
            return f"Khung giờ {slot['label']} phù hợp với lịch chơi quen thuộc của bạn."

        if has_history and day_score >= 0.6:
            return f"Bạn thường chơi vào những ngày có lịch tương tự, nên {slot['label']} là lựa chọn hợp lý."

        if price_score >= 0.7:
            return f"Mức giá của khung giờ {slot['label']} gần với những lần đặt gần đây của bạn."

        return f"Khung giờ {slot['label']} đang là lựa chọn cân bằng để đặt nhanh hôm nay."

    def _score_slot(
        self,
        *,
        slot: dict[str, Any],
        available_slots: list[dict[str, Any]],
        history_stats: dict[str, Any],
        target_day: str,
        has_history: bool,
    ) -> dict[str, Any]:
        court_time_score = _normalized_counter_value(
            history_stats["court_time_counts"],
            _build_court_time_key(slot["courtId"], slot["startTime"], slot["endTime"]),
        )
        court_score = _normalized_counter_value(history_stats["court_counts"], slot["courtId"])
        time_score = _normalized_counter_value(
            history_stats["time_counts"],
            _build_time_key(slot["startTime"], slot["endTime"]),
        )
        day_score = _normalized_counter_value(history_stats["day_counts"], target_day)
        price_score = self._score_price_fit(slot["priceVnd"], history_stats["average_price"], available_slots)
        global_score = self._score_global_signal(slot, target_day)

        if has_history:
            total_score = (
                0.45 * court_time_score
                + 0.20 * court_score
                + 0.15 * time_score
                + 0.10 * day_score
                + 0.05 * price_score
                + 0.05 * global_score
            )
        else:
            total_score = 0.50 * global_score + 0.25 * _score_prime_time(slot["startTime"]) + 0.25 * price_score

        return {
            **slot,
            "score": round(float(total_score), 4),
            "reason": self._build_reason(
                slot,
                has_history=has_history,
                court_time_score=court_time_score,
                court_score=court_score,
                time_score=time_score,
                day_score=day_score,
                price_score=price_score,
            ),
        }
