jest.mock('../src/repositories/booking.repository', () => ({
  listBookingsByUserId: jest.fn(),
  countBookingsByUserId: jest.fn(),
  listAllBookings: jest.fn(),
  countAllBookings: jest.fn()
}));

const bookingService = require('../src/services/booking.service');
const bookingRepository = require('../src/repositories/booking.repository');

describe('booking.service authorization and list behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getUserBookings allows user when req.user.id is string but matches target id', async () => {
    bookingRepository.listBookingsByUserId.mockResolvedValue([
      {
        id: 10,
        user_id: 2,
        court_id: 1,
        slot_id: 3,
        booking_date: '2026-03-10',
        status: 'CANCELLED',
        amount_cents: 1200,
        currency: 'USD',
        lock_expires_at: null,
        confirmed_at: null,
        cancelled_at: '2026-03-10T10:00:00.000Z',
        court_name: 'Court A',
        slot_label: 'Morning',
        start_time: '06:00:00',
        end_time: '07:00:00',
        created_at: '2026-03-10T09:00:00.000Z'
      }
    ]);
    bookingRepository.countBookingsByUserId.mockResolvedValue(1);

    const result = await bookingService.getUserBookings(
      { id: '2', role: 'user' },
      '2',
      { page: 1, limit: 20 }
    );

    expect(bookingRepository.listBookingsByUserId).toHaveBeenCalledWith(2, { limit: 20, offset: 0 });
    expect(bookingRepository.countBookingsByUserId).toHaveBeenCalledWith(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].userId).toBe(2);
    expect(result.pagination.total).toBe(1);
  });

  test('getAllBookings returns mapped items and pagination for admin', async () => {
    bookingRepository.listAllBookings.mockResolvedValue([
      {
        id: 100,
        user_id: 1,
        user_name: 'Admin User',
        court_id: 1,
        slot_id: 2,
        booking_date: '2026-03-10',
        status: 'CANCELLED',
        amount_cents: 1800,
        currency: 'USD',
        lock_expires_at: null,
        confirmed_at: null,
        cancelled_at: '2026-03-10T11:00:00.000Z',
        court_name: 'Court A',
        slot_label: 'Prime',
        start_time: '18:00:00',
        end_time: '19:00:00',
        created_at: '2026-03-10T10:00:00.000Z',
        updated_at: '2026-03-10T11:00:00.000Z'
      }
    ]);
    bookingRepository.countAllBookings.mockResolvedValue(1);

    const result = await bookingService.getAllBookings(
      { id: 1, role: 'admin' },
      { page: 1, limit: 20 }
    );

    expect(bookingRepository.listAllBookings).toHaveBeenCalledWith({
      userId: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      limit: 20,
      offset: 0
    });
    expect(bookingRepository.countAllBookings).toHaveBeenCalledWith({
      userId: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined
    });
    expect(result.items[0].userName).toBe('Admin User');
    expect(result.pagination.total).toBe(1);
  });
});
