import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { updateSystemSettings } from '../../services/settingsService';
import { getApiErrorMessage } from '../../utils/errors';

const SUPPORTED_CURRENCIES = ['VND', 'USD', 'EUR'];

function AdminSettings() {
  const { settings, isLoading, error, applySettings } = useSystemSettings();
  const [form, setForm] = useState({
    displayCurrency: 'VND',
    bookingHoldMinutes: '10'
  });
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    setForm({
      displayCurrency: settings.displayCurrency,
      bookingHoldMinutes: String(settings.bookingHoldMinutes)
    });
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: (nextSettings) => {
      applySettings(nextSettings);
      setSavedMessage('Cài đặt đã được lưu và áp dụng cho các lượt đặt mới.');
    }
  });

  function handleSubmit(event) {
    event.preventDefault();
    setSavedMessage('');

    updateMutation.mutate({
      displayCurrency: form.displayCurrency,
      bookingHoldMinutes: Number(form.bookingHoldMinutes)
    });
  }

  return (
    <div className='max-w-2xl space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>Cài đặt</h2>
        <p className='mt-1 text-sm text-slate-600'>
          Cấu hình đang hoạt động cho thời gian giữ chỗ và đơn vị tiền tệ hiển thị trên toàn hệ thống.
        </p>

        <form className='mt-5 space-y-4' onSubmit={handleSubmit}>
          <label className='block'>
            <span className='text-sm font-medium text-slate-700'>Đơn vị tiền tệ hiển thị</span>
            <select
              value={form.displayCurrency}
              onChange={(event) => setForm((prev) => ({ ...prev, displayCurrency: event.target.value }))}
              disabled={isLoading || updateMutation.isPending}
              className='mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50'
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <p className='mt-1 text-xs text-slate-500'>Giá và doanh thu vẫn lưu theo VND, UI sẽ quy đổi để hiển thị.</p>
          </label>

          <label className='block'>
            <span className='text-sm font-medium text-slate-700'>Thời gian giữ chỗ (phút)</span>
            <input
              type='number'
              min='1'
              max='120'
              value={form.bookingHoldMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, bookingHoldMinutes: event.target.value }))}
              disabled={isLoading || updateMutation.isPending}
              className='mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50'
            />
            <p className='mt-1 text-xs text-slate-500'>Áp dụng cho các lượt giữ chỗ mới tạo sau khi lưu cài đặt.</p>
          </label>

          {error && !updateMutation.isError ? (
            <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
              {getApiErrorMessage(error, 'Không tải được cài đặt hiện tại.')}
            </div>
          ) : null}

          {updateMutation.isError ? (
            <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {getApiErrorMessage(updateMutation.error, 'Lưu cài đặt thất bại.')}
            </div>
          ) : null}

          {savedMessage ? (
            <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
              {savedMessage}
            </div>
          ) : null}

          <button
            type='submit'
            disabled={isLoading || updateMutation.isPending}
            className='rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70'
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </form>
      </section>

      <section className='surface-card p-5'>
        <h3 className='text-base font-semibold text-slate-900'>Hiệu lực hiện tại</h3>
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Tiền tệ hiển thị</p>
            <p className='mt-2 text-lg font-semibold text-slate-900'>{settings.displayCurrency}</p>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Giữ chỗ mặc định</p>
            <p className='mt-2 text-lg font-semibold text-slate-900'>{settings.bookingHoldMinutes} phút</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminSettings;
