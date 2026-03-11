import api, { unwrapPayload } from './api';

export async function createPaymentIntent({ bookingId }) {
  const response = await api.post('/payments/create-intent', {
    bookingId
  });

  const payload = unwrapPayload(response);
  return {
    provider: payload.provider,
    bookingId: Number(payload.bookingId),
    bookingStatus: payload.bookingStatus,
    amountVnd: Number(payload.amountVnd || 0),
    currency: payload.currency || 'VND',
    transferCode: payload.transferCode || '',
    bankName: payload.bankName || '',
    bankCode: payload.bankCode || '',
    bankAccountNo: payload.bankAccountNo || '',
    bankAccountName: payload.bankAccountName || '',
    merchantCode: payload.merchantCode || '',
    qrUrl: payload.qrUrl || '',
    lockExpiresAt: payload.lockExpiresAt || null
  };
}
