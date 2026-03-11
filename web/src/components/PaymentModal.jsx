import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyFromVnd } from '../utils/formatters';

function toCountdownText(target) {
  if (!target) {
    return '--:--';
  }

  const diff = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  const minutes = String(Math.floor(diff / 60)).padStart(2, '0');
  const seconds = String(diff % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function PaymentModal({ open, paymentInfo, onClose }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const intervalRef = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalRef);
  }, [open]);

  const lockDeadline = useMemo(() => {
    if (!paymentInfo?.lockExpiresAt) {
      return null;
    }

    const parsed = new Date(paymentInfo.lockExpiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }, [paymentInfo]);

  if (!open || !paymentInfo) {
    return null;
  }

  const countdown = toCountdownText(lockDeadline, tick);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4'>
      <div className='w-full max-w-xl rounded-2xl bg-white p-6 shadow-panel'>
        <h3 className='text-lg font-semibold text-slate-900'>Thanh toán chuyển khoản SePay</h3>
        <p className='mt-1 text-sm text-slate-600'>
          Vui lòng chuyển đúng số tiền và nội dung để hệ thống xác nhận tự động.
        </p>

        <div className='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'>
          <p>
            <span className='font-semibold'>Số tiền:</span> {formatCurrencyFromVnd(paymentInfo.amountVnd)}
          </p>
          <p className='mt-1'>
            <span className='font-semibold'>Ngân hàng:</span> {paymentInfo.bankName}
          </p>
          <p className='mt-1'>
            <span className='font-semibold'>Số tài khoản:</span> {paymentInfo.bankAccountNo}
          </p>
          <p className='mt-1'>
            <span className='font-semibold'>Chủ tài khoản:</span> {paymentInfo.bankAccountName}
          </p>
          <p className='mt-1'>
            <span className='font-semibold'>Nội dung CK:</span> {paymentInfo.transferCode}
          </p>
          <p className='mt-1'>
            <span className='font-semibold'>Giữ chỗ còn:</span> {countdown}
          </p>
        </div>

        {paymentInfo.qrUrl ? (
          <div className='mt-4 flex justify-center'>
            <img
              src={paymentInfo.qrUrl}
              alt='QR thanh toán SePay'
              className='h-64 w-64 rounded-lg border border-slate-200 object-contain'
            />
          </div>
        ) : null}

        <div className='mt-5 flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
