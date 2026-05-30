const { env } = require('../config/env');
const { assertISODate, formatTimeHHmm, normalizeISODateOnly } = require('../utils/date-time');
const bookingRepository = require('../repositories/booking.repository');
const slotRepository = require('../repositories/slot.repository');

const AI_TIMEOUT_MS = 1200;
const HISTORY_LIMIT = 50;
const MAX_RECOMMENDATIONS = 3;
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  timeZone: 'UTC'
});

function getDayOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? '' : WEEKDAY_FORMATTER.format(date);
}

function buildTimeLabel(startTime, endTime) {
  return `${formatTimeHHmm(startTime)} - ${formatTimeHHmm(endTime)}`;
}

function buildTimeKey(startTime, endTime) {
  return `${formatTimeHHmm(startTime)}|${formatTimeHHmm(endTime)}`;
}

function buildCourtTimeKey(courtId, startTime, endTime) {
  return `${Number(courtId)}|${buildTimeKey(startTime, endTime)}`;
}

function incrementCounter(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function getNormalizedCount(map, key) {
  if (!map.size) {
    return 0;
  }

  const maxValue = Math.max(...map.values());
  if (maxValue <= 0) {
    return 0;
  }

  return (map.get(key) || 0) / maxValue;
}

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function mapAvailableSlot(slot) {
  return {
    courtId: Number(slot.court_id),
    courtName: slot.court_name,
    location: slot.court_location,
    slotId: Number(slot.slot_id),
    label: buildTimeLabel(slot.start_time, slot.end_time),
    startTime: formatTimeHHmm(slot.start_time),
    endTime: formatTimeHHmm(slot.end_time),
    priceVnd: Number(slot.price_vnd)
  };
}

function mapHistoryEntry(entry) {
  return {
    bookingDate: normalizeISODateOnly(entry.booking_date),
    dayOfWeek: getDayOfWeek(normalizeISODateOnly(entry.booking_date)),
    courtId: Number(entry.court_id),
    courtName: entry.court_name,
    startTime: formatTimeHHmm(entry.start_time),
    endTime: formatTimeHHmm(entry.end_time),
    priceVnd: Number(entry.price_vnd ?? entry.amount_vnd ?? 0)
  };
}

function buildHistoryStats(history) {
  const courtTimeCounts = new Map();
  const courtCounts = new Map();
  const timeCounts = new Map();
  const dayCounts = new Map();
  const prices = [];

  for (const item of history) {
    incrementCounter(courtTimeCounts, buildCourtTimeKey(item.courtId, item.startTime, item.endTime));
    incrementCounter(courtCounts, Number(item.courtId));
    incrementCounter(timeCounts, buildTimeKey(item.startTime, item.endTime));
    incrementCounter(dayCounts, item.dayOfWeek);

    if (Number.isFinite(item.priceVnd)) {
      prices.push(Number(item.priceVnd));
    }
  }

  return {
    courtTimeCounts,
    courtCounts,
    timeCounts,
    dayCounts,
    averagePriceVnd: prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null
  };
}

function scorePriceFit(priceVnd, averagePriceVnd, availableSlots) {
  if (averagePriceVnd && averagePriceVnd > 0) {
    return clampScore(1 - Math.min(Math.abs(priceVnd - averagePriceVnd) / averagePriceVnd, 1));
  }

  const prices = availableSlots.map((slot) => slot.priceVnd);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  if (maxPrice === minPrice) {
    return 0.7;
  }

  return clampScore(1 - (priceVnd - minPrice) / (maxPrice - minPrice));
}

function scorePrimeTime(startTime) {
  const hour = Number.parseInt(formatTimeHHmm(startTime).slice(0, 2), 10);
  if (Number.isNaN(hour)) {
    return 0.4;
  }

  return clampScore(1 - Math.min(Math.abs(hour - 19) / 12, 1));
}

function buildReason(slot, { courtTimeScore, courtTimeCount, courtScore, timeScore, dayScore, priceScore, hasHistory }) {
  if (courtTimeScore >= 0.6 && courtTimeCount > 0) {
    return `Bạn thường chơi ${slot.courtName} trong khung giờ ${slot.label} ${courtTimeCount} lần.`;
  }

  if (courtScore >= 0.65 && timeScore >= 0.45) {
    return `${slot.courtName} là sân bạn đặt thường xuyên và khung giờ ${slot.label} khá sát thói quen hiện tại.`;
  }

  if (timeScore >= 0.65) {
    return `Khung giờ ${slot.label} phù hợp với lịch chơi quen thuộc của bạn.`;
  }

  if (hasHistory && dayScore >= 0.6) {
    return `Bạn thường chơi vào ${slot.label} trong ngày có lịch tương tự.`;
  }

  if (priceScore >= 0.7) {
    return `Mức giá của khung giờ ${slot.label} khá gần với những lần đặt gần đây của bạn.`;
  }

  return `Khung giờ ${slot.label} đang là lựa chọn phù hợp để đặt nhanh trong ngày này.`;
}

function scoreFallbackOption(slot, historyStats, targetDay, availableSlots) {
  const courtTimeKey = buildCourtTimeKey(slot.courtId, slot.startTime, slot.endTime);
  const courtTimeScore = getNormalizedCount(
    historyStats.courtTimeCounts,
    courtTimeKey
  );
  const courtTimeCount = historyStats.courtTimeCounts.get(courtTimeKey) || 0;
  const courtScore = getNormalizedCount(historyStats.courtCounts, slot.courtId);
  const timeScore = getNormalizedCount(historyStats.timeCounts, buildTimeKey(slot.startTime, slot.endTime));
  const dayScore = getNormalizedCount(historyStats.dayCounts, targetDay);
  const priceScore = scorePriceFit(slot.priceVnd, historyStats.averagePriceVnd, availableSlots);
  const hasHistory = historyStats.courtCounts.size > 0;

  const totalScore = hasHistory
    ? 0.45 * courtTimeScore + 0.25 * courtScore + 0.15 * timeScore + 0.1 * dayScore + 0.05 * priceScore
    : 0.55 * scorePrimeTime(slot.startTime) + 0.45 * priceScore;

  return {
    ...slot,
    score: Number(totalScore.toFixed(4)),
    reason: hasHistory
      ? buildReason(slot, { courtTimeScore, courtTimeCount, courtScore, timeScore, dayScore, priceScore, hasHistory })
      : `Khung giờ ${slot.label} dễ tiếp cận cho người chơi mới và còn trống để đặt ngay.`
  };
}

function buildFallbackRecommendations(availableSlots, history, targetDate) {
  const targetDay = getDayOfWeek(targetDate);
  const historyStats = buildHistoryStats(history);

  return availableSlots
    .map((slot) => scoreFallbackOption(slot, historyStats, targetDay, availableSlots))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.priceVnd !== right.priceVnd) {
        return left.priceVnd - right.priceVnd;
      }

      return left.courtName.localeCompare(right.courtName);
    })
    .slice(0, MAX_RECOMMENDATIONS);
}

function normalizeRecommendedOption(option, availableSlotMap) {
  const slotId = Number(option?.slotId);
  const availableSlot = availableSlotMap.get(slotId);
  if (!availableSlot) {
    return null;
  }

  return {
    ...availableSlot,
    score: Number(Number(option?.score ?? 0).toFixed(4)),
    reason: String(option?.reason || `Khung giờ ${availableSlot.label} phù hợp với lịch chơi của bạn.`).trim()
  };
}

async function fetchRankedRecommendations(payload, availableSlots) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.AI_SERVICE_BASE_URL}/ai/recommendations/score`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return {
        recommendedOptions: [],
        status: 'unavailable',
        strategy: 'fallback'
      };
    }

    const rawPayload = await response.json();
    const availableSlotMap = new Map(availableSlots.map((slot) => [slot.slotId, slot]));
    const recommendedOptions = Array.isArray(rawPayload?.recommendedOptions)
      ? rawPayload.recommendedOptions
          .map((option) => normalizeRecommendedOption(option, availableSlotMap))
          .filter(Boolean)
          .slice(0, MAX_RECOMMENDATIONS)
      : [];

    return {
      recommendedOptions,
      status: 'ok',
      strategy: String(rawPayload?.strategy || 'personalized')
    };
  } catch (_error) {
    return {
      recommendedOptions: [],
      status: 'unavailable',
      strategy: 'fallback'
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildResponse(date, recommendedOptions, aiStatus, strategy) {
  const recommendedCourtIds = [...new Set(recommendedOptions.map((option) => option.courtId))];

  return {
    date,
    strategy,
    aiStatus,
    recommendedCourtIds,
    recommendedOptions
  };
}

async function getRecommendedCourts(currentUser, { date }) {
  const bookingDate = String(date || '').trim();
  assertISODate(bookingDate, 'date');

  const rawSlots = await slotRepository.listAvailableSlotsByDate(bookingDate);
  const availableSlots = rawSlots
    .filter((slot) => slot.status === 'AVAILABLE')
    .map(mapAvailableSlot);

  if (availableSlots.length === 0) {
    return buildResponse(bookingDate, [], 'ok', 'empty');
  }

  const history = (await bookingRepository.listRecommendationHistoryByUserId(currentUser.id, { limit: HISTORY_LIMIT })).map(
    mapHistoryEntry
  );

  const aiPayload = {
    user: {
      id: Number(currentUser.id)
    },
    targetDate: bookingDate,
    availableSlots,
    history
  };

  const aiResult = await fetchRankedRecommendations(aiPayload, availableSlots);
  if (aiResult.status === 'ok' && aiResult.recommendedOptions.length > 0) {
    return buildResponse(bookingDate, aiResult.recommendedOptions, aiResult.status, aiResult.strategy);
  }

  const fallbackOptions = buildFallbackRecommendations(availableSlots, history, bookingDate);
  return buildResponse(bookingDate, fallbackOptions, aiResult.status, aiResult.strategy);
}

module.exports = {
  getRecommendedCourts
};
