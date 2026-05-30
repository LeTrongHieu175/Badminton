from __future__ import annotations

from dataclasses import dataclass
from typing import Any


def _as_number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _format_hour(hour: Any) -> str:
    try:
        return f"{int(hour):02d}:00"
    except (TypeError, ValueError):
        return "--:--"


@dataclass
class AdminInsightService:
    max_recommendations: int = 4

    def generate(self, payload: dict[str, Any]) -> dict[str, Any]:
        stats = payload.get("stats") or {}
        revenue_series = payload.get("revenueSeries") or []
        peak_hours = payload.get("peakHours") or []
        utilization_by_court = payload.get("utilizationByCourt") or []
        revenue_trend = payload.get("revenueTrend") or {}

        top_hour = max(peak_hours, key=lambda item: _as_number(item.get("bookingCount")), default=None)
        weakest_court = min(
            utilization_by_court,
            key=lambda item: _as_number(item.get("utilizationPercent")),
            default=None,
        )
        strongest_court = max(
            utilization_by_court,
            key=lambda item: _as_number(item.get("utilizationPercent")),
            default=None,
        )

        summary = self._build_summary(
            stats=stats,
            revenue_series=revenue_series,
            revenue_trend=revenue_trend,
            top_hour=top_hour,
            strongest_court=strongest_court,
            weakest_court=weakest_court,
        )

        recommendations = self._build_recommendations(
            revenue_trend=revenue_trend,
            top_hour=top_hour,
            strongest_court=strongest_court,
            weakest_court=weakest_court,
        )

        return {
            "strategy": "admin_ml",
            "summary": summary,
            "recommendations": recommendations[: self.max_recommendations],
        }

    def _build_summary(
        self,
        *,
        stats: dict[str, Any],
        revenue_series: list[dict[str, Any]],
        revenue_trend: dict[str, Any],
        top_hour: dict[str, Any] | None,
        strongest_court: dict[str, Any] | None,
        weakest_court: dict[str, Any] | None,
    ) -> str:
        total_bookings = int(_as_number(stats.get("totalBookings")))
        utilization = _as_number(stats.get("avgUtilizationPercent"))
        summary_parts = [
            f"Tổng quan hiện tại ghi nhận {total_bookings} lượt đặt với mức sử dụng trung bình {utilization:.1f}%.",
        ]

        if top_hour:
            summary_parts.append(
                f"Nhu cầu đang tập trung mạnh nhất vào khung {_format_hour(top_hour.get('hour'))}."
            )

        direction = str(revenue_trend.get("direction") or "stable")
        change_percent = abs(_as_number(revenue_trend.get("changePercent")))
        if direction == "up":
            summary_parts.append(f"Doanh thu ngắn hạn đang tăng khoảng {change_percent:.1f}% so với giai đoạn liền trước.")
        elif direction == "down":
            summary_parts.append(f"Doanh thu ngắn hạn đang giảm khoảng {change_percent:.1f}% và cần theo dõi thêm.")
        elif revenue_series:
            summary_parts.append("Doanh thu đang giữ nhịp tương đối ổn định giữa các chu kỳ gần đây.")

        if strongest_court and weakest_court:
            summary_parts.append(
                f"Chênh lệch hiệu suất giữa {strongest_court.get('courtName', 'sân mạnh nhất')} và "
                f"{weakest_court.get('courtName', 'sân yếu nhất')} đang đủ lớn để cần tối ưu vận hành."
            )

        return " ".join(summary_parts)

    def _build_recommendations(
        self,
        *,
        revenue_trend: dict[str, Any],
        top_hour: dict[str, Any] | None,
        strongest_court: dict[str, Any] | None,
        weakest_court: dict[str, Any] | None,
    ) -> list[dict[str, str]]:
        recommendations: list[dict[str, str]] = []

        if top_hour:
            recommendations.append(
                {
                    "title": "Tối ưu khung giờ cao điểm",
                    "priority": "high",
                    "reason": (
                        f"Khung {_format_hour(top_hour.get('hour'))} đang có nhu cầu cao nhất "
                        f"với khoảng {int(_as_number(top_hour.get('bookingCount')))} lượt đặt."
                    ),
                    "action": "Xem xét mở thêm slot hoặc ưu tiên điều phối nhân sự vào khung giờ này.",
                }
            )

        if weakest_court:
            weakest_utilization = _as_number(weakest_court.get("utilizationPercent"))
            recommendations.append(
                {
                    "title": "Kích cầu sân hiệu suất thấp",
                    "priority": "high" if weakest_utilization < 35 else "medium",
                    "reason": (
                        f"{weakest_court.get('courtName', 'Sân')} đang có công suất thấp nhất "
                        f"ở mức {weakest_utilization:.1f}%."
                    ),
                    "action": "Áp dụng ưu đãi thấp điểm hoặc điều chỉnh hiển thị để tăng lấp đầy.",
                }
            )

        if strongest_court:
            strongest_utilization = _as_number(strongest_court.get("utilizationPercent"))
            recommendations.append(
                {
                    "title": "Mở rộng sân hiệu suất cao",
                    "priority": "medium" if strongest_utilization >= 70 else "low",
                    "reason": (
                        f"{strongest_court.get('courtName', 'Sân')} đang dẫn đầu hệ thống "
                        f"với công suất {strongest_utilization:.1f}%."
                    ),
                    "action": "Ưu tiên sân này trong chiến dịch bán hàng và đánh giá khả năng mở rộng khung giờ.",
                }
            )

        direction = str(revenue_trend.get("direction") or "stable")
        change_percent = abs(_as_number(revenue_trend.get("changePercent")))
        if direction == "down":
            recommendations.append(
                {
                    "title": "Chặn đà giảm doanh thu",
                    "priority": "high",
                    "reason": f"Doanh thu 7 ngày gần nhất đang giảm khoảng {change_percent:.1f}%.",
                    "action": "Kiểm tra tỷ lệ lấp đầy theo ngày và triển khai ưu đãi ngắn hạn cho nhóm sân yếu.",
                }
            )
        elif direction == "up":
            recommendations.append(
                {
                    "title": "Khai thác đà tăng doanh thu",
                    "priority": "low",
                    "reason": f"Doanh thu 7 ngày gần nhất tăng khoảng {change_percent:.1f}%.",
                    "action": "Giữ nhịp truyền thông hiện tại và theo dõi xem tăng trưởng có tập trung vào vài khung giờ hay không.",
                }
            )

        return recommendations
