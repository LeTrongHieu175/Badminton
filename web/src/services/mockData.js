const COURT_NAMES = ['Court A', 'Court B', 'Court C', 'Court D', 'Court E'];
const COURT_LOCATIONS = [
  'District 1 - Main Hall',
  'District 1 - Main Hall',
  'District 3 - Community Center',
  'District 7 - Riverside Sports',
  'Thu Duc - University Arena'
];

export const mockCourts = COURT_NAMES.map((name, index) => ({
  id: index + 1,
  name,
  location: COURT_LOCATIONS[index],
  pricePerHour: [12, 12, 14, 15.5, 13.5][index],
  status: index === 3 ? 'MAINTENANCE' : 'ACTIVE'
}));

export const mockUsers = [
  'Admin One',
  'Player One',
  'Player Two',
  'Player Three',
  'Player Four',
  'Player Five',
  'Player Six',
  'Player Seven',
  'Player Eight',
  'Player Nine'
].map((name, index) => ({
  id: index + 1,
  name,
  email: `${name.toLowerCase().replaceAll(' ', '.')}@smartbadminton.local`,
  role: index === 0 ? 'admin' : 'user'
}));

function statusFromSeed(seed) {
  const roll = seed % 100;
  if (roll < 62) return 'AVAILABLE';
  if (roll < 74) return 'LOCKED';
  if (roll < 94) return 'CONFIRMED';
  return 'CANCELLED';
}

export function buildDailySlots(courtId, date) {
  const daySeed = Number(String(date || '').replaceAll('-', '')) || 20260101;
  return Array.from({ length: 16 }, (_, idx) => {
    const hour = 6 + idx;
    const seed = daySeed + courtId * 13 + idx * 7;
    const status = statusFromSeed(seed);

    return {
      id: idx + 1,
      label: `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`,
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime: `${String(hour + 1).padStart(2, '0')}:00`,
      status,
      price: mockCourts.find((court) => court.id === courtId)?.pricePerHour || 12
    };
  });
}

export const mockRevenueSeries = [
  { period: 'Jan', revenue: 23800 },
  { period: 'Feb', revenue: 25100 },
  { period: 'Mar', revenue: 26750 },
  { period: 'Apr', revenue: 28420 },
  { period: 'May', revenue: 29100 },
  { period: 'Jun', revenue: 30560 },
  { period: 'Jul', revenue: 32980 },
  { period: 'Aug', revenue: 34120 },
  { period: 'Sep', revenue: 35780 },
  { period: 'Oct', revenue: 37910 },
  { period: 'Nov', revenue: 39220 },
  { period: 'Dec', revenue: 41750 }
];

export const mockUtilization = [
  { court: 'Court A', usage: 79 },
  { court: 'Court B', usage: 73 },
  { court: 'Court C', usage: 86 },
  { court: 'Court D', usage: 41 },
  { court: 'Court E', usage: 68 }
];

export const mockPeakHours = Array.from({ length: 16 }, (_, idx) => {
  const hour = 6 + idx;
  const demand = Math.max(12, Math.round(30 + Math.sin(hour / 2) * 20 + (hour > 16 ? 30 : 0)));
  return {
    hour: `${String(hour).padStart(2, '0')}:00`,
    demand
  };
});

export const mockRecentBookings = Array.from({ length: 10 }, (_, index) => {
  const court = mockCourts[index % mockCourts.length];
  const user = mockUsers[(index + 1) % mockUsers.length];
  const day = (index % 27) + 1;
  const hour = 6 + (index % 16);

  return {
    id: index + 1,
    bookingDate: `2026-02-${String(day).padStart(2, '0')}`,
    courtName: court.name,
    slotLabel: `${String(hour).padStart(2, '0')}:00-${String(hour + 1).padStart(2, '0')}:00`,
    userName: user.name,
    status: ['CONFIRMED', 'COMPLETED', 'PENDING', 'CANCELLED'][index % 4],
    amount: court.pricePerHour
  };
});

export const mockStats = {
  totalRevenue: 41750,
  totalBookings: 10432,
  activeUsers: 1280,
  avgUtilization: 69.4
};
