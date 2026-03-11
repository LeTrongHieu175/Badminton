const VND_CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

const VI_NUMBER_FORMATTER = new Intl.NumberFormat('vi-VN');
const VI_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const STATUS_LABELS = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  MAINTENANCE: 'Bảo trì',
  AVAILABLE: 'Còn trống',
  LOCKED: 'Đã khóa',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Hoàn tiền',
  PENDING: 'Đang chờ'
};

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  user: 'Người dùng'
};

export function formatCurrencyVnd(amount) {
  return VND_CURRENCY_FORMATTER.format(Number(amount || 0));
}

export function formatCurrencyFromVnd(vnd) {
  return formatCurrencyVnd(vnd);
}

export function formatNumberVi(value) {
  return VI_NUMBER_FORMATTER.format(Number(value || 0));
}

export function formatStatusLabel(status) {
  const key = String(status || '').toUpperCase();
  return STATUS_LABELS[key] || key;
}

export function formatRoleLabel(role) {
  const key = String(role || '').toLowerCase();
  return ROLE_LABELS[key] || key;
}

export function formatDateVi(dateInput) {
  if (!dateInput) {
    return '-';
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return String(dateInput);
  }

  return VI_DATE_FORMATTER.format(date);
}
