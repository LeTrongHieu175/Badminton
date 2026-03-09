from __future__ import annotations

import csv
import random
from pathlib import Path

DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

TIME_SLOTS = [f"{hour:02d}:00" for hour in range(6, 22)]
WINDOWS = {
    "early": ["06:00", "07:00", "08:00", "09:00"],
    "mid": ["10:00", "11:00", "12:00", "13:00"],
    "late": ["14:00", "15:00", "16:00", "17:00"],
    "prime": ["18:00", "19:00", "20:00", "21:00"],
}


def build_user_profiles(total_users: int, rng: random.Random) -> dict[int, dict]:
    profiles: dict[int, dict] = {}

    window_names = list(WINDOWS.keys())

    for user_id in range(1, total_users + 1):
        primary_window = rng.choice(window_names)
        secondary_window = rng.choice([name for name in window_names if name != primary_window])

        preferred_days = rng.sample(DAYS_OF_WEEK, k=3)
        backup_days = rng.sample([day for day in DAYS_OF_WEEK if day not in preferred_days], k=2)

        preferred_courts = rng.sample([1, 2, 3, 4, 5], k=2)

        profiles[user_id] = {
            "primary_window": primary_window,
            "secondary_window": secondary_window,
            "preferred_days": preferred_days,
            "backup_days": backup_days,
            "preferred_courts": preferred_courts,
        }

    return profiles


def weighted_choice(options: list[str], fallback: list[str], rng: random.Random, primary_weight: float) -> str:
    if rng.random() < primary_weight:
        return rng.choice(options)
    return rng.choice(fallback)


def generate_dataset(output_path: Path, rows: int = 10000, seed: int = 42) -> None:
    rng = random.Random(seed)
    profiles = build_user_profiles(total_users=300, rng=rng)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["user_id", "court_id", "day_of_week", "time_slot"])

        for _ in range(rows):
            user_id = rng.randint(1, 300)
            profile = profiles[user_id]

            day = weighted_choice(
                options=profile["preferred_days"],
                fallback=DAYS_OF_WEEK,
                rng=rng,
                primary_weight=0.72,
            )

            if day not in profile["preferred_days"] and rng.random() < 0.45:
                day = rng.choice(profile["backup_days"])

            primary_slots = WINDOWS[profile["primary_window"]]
            secondary_slots = WINDOWS[profile["secondary_window"]]

            if rng.random() < 0.68:
                time_slot = rng.choice(primary_slots)
            elif rng.random() < 0.5:
                time_slot = rng.choice(secondary_slots)
            else:
                time_slot = rng.choice(TIME_SLOTS)

            if rng.random() < 0.75:
                court_id = rng.choice(profile["preferred_courts"])
            else:
                court_id = rng.randint(1, 5)

            writer.writerow([user_id, court_id, day, time_slot])


if __name__ == "__main__":
    target_file = Path(__file__).resolve().parent / "booking_history.csv"
    generate_dataset(output_path=target_file, rows=10000, seed=42)
    print(f"Generated synthetic dataset: {target_file}")
