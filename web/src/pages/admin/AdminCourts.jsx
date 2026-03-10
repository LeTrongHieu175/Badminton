import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCourt, useCourts } from '../../hooks/useCourts';
import {
  createCourt,
  createCourtSlot,
  deleteCourt,
  deleteCourtSlot,
  updateCourt,
  updateCourtSlot
} from '../../services/courtService';
import { formatCurrencyFromCents } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/errors';

function AdminCourts() {
  const queryClient = useQueryClient();
  const [selectedCourtId, setSelectedCourtId] = useState(null);
  const [courtForm, setCourtForm] = useState({ name: '', location: '' });
  const [slotForm, setSlotForm] = useState({ label: '', startTime: '', endTime: '', priceCents: '' });

  const { data: courts = [], isLoading, isError, error } = useCourts({ includeInactive: true });
  const { data: selectedCourt } = useCourt(selectedCourtId);

  const createCourtMutation = useMutation({
    mutationFn: createCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      setCourtForm({ name: '', location: '' });
    }
  });

  const updateCourtMutation = useMutation({
    mutationFn: ({ courtId, payload }) => updateCourt(courtId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      queryClient.invalidateQueries({ queryKey: ['court', selectedCourtId] });
    }
  });

  const deleteCourtMutation = useMutation({
    mutationFn: (courtId) => deleteCourt(courtId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      queryClient.invalidateQueries({ queryKey: ['court', selectedCourtId] });
    }
  });

  const createSlotMutation = useMutation({
    mutationFn: ({ courtId, payload }) => createCourtSlot(courtId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court', selectedCourtId] });
      setSlotForm({ label: '', startTime: '', endTime: '', priceCents: '' });
    }
  });

  const updateSlotMutation = useMutation({
    mutationFn: ({ courtId, slotId, payload }) => updateCourtSlot(courtId, slotId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court', selectedCourtId] });
    }
  });

  const deleteSlotMutation = useMutation({
    mutationFn: ({ courtId, slotId }) => deleteCourtSlot(courtId, slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court', selectedCourtId] });
    }
  });

  const sortedCourts = useMemo(() => {
    return [...courts].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
  }, [courts]);

  const hasMutationError =
    createCourtMutation.isError ||
    updateCourtMutation.isError ||
    deleteCourtMutation.isError ||
    createSlotMutation.isError ||
    updateSlotMutation.isError ||
    deleteSlotMutation.isError;

  const mutationError =
    createCourtMutation.error ||
    updateCourtMutation.error ||
    deleteCourtMutation.error ||
    createSlotMutation.error ||
    updateSlotMutation.error ||
    deleteSlotMutation.error;

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>Quản lý sân</h2>
        <p className='mt-1 text-sm text-slate-600'>Tạo, cập nhật và vô hiệu hóa sân (soft delete).</p>

        <form
          className='mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]'
          onSubmit={(event) => {
            event.preventDefault();
            createCourtMutation.mutate({
              name: courtForm.name,
              location: courtForm.location
            });
          }}
        >
          <input
            required
            type='text'
            value={courtForm.name}
            onChange={(event) => setCourtForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder='Tên sân'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />
          <input
            type='text'
            value={courtForm.location}
            onChange={(event) => setCourtForm((prev) => ({ ...prev, location: event.target.value }))}
            placeholder='Vị trí'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />
          <button
            type='submit'
            disabled={createCourtMutation.isPending}
            className='rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70'
          >
            Thêm sân
          </button>
        </form>
      </section>

      {isLoading ? <p className='text-sm text-slate-500'>Đang tải danh sách sân...</p> : null}

      {isError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(error, 'Không tải được danh sách sân.')}
        </div>
      ) : null}

      {hasMutationError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(mutationError, 'Thao tác với sân/slot thất bại.')}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <section className='surface-card overflow-hidden p-0'>
          <table className='min-w-full divide-y divide-slate-200 text-sm'>
            <thead className='bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500'>
              <tr>
                <th className='px-4 py-3'>Tên sân</th>
                <th className='px-4 py-3'>Vị trí</th>
                <th className='px-4 py-3'>Trạng thái</th>
                <th className='px-4 py-3'>Thao tác</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 bg-white'>
              {sortedCourts.map((court) => (
                <tr key={court.id}>
                  <td className='px-4 py-3 font-medium text-slate-900'>{court.name}</td>
                  <td className='px-4 py-3 text-slate-700'>{court.location || '-'}</td>
                  <td className='px-4 py-3 text-slate-700'>
                    {court.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() => setSelectedCourtId(court.id)}
                        className='rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700'
                      >
                        Quản lý slot
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          updateCourtMutation.mutate({
                            courtId: court.id,
                            payload: { isActive: !court.isActive }
                          })
                        }
                        className='rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700'
                      >
                        {court.isActive ? 'Ẩn sân' : 'Kích hoạt lại'}
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          updateCourtMutation.mutate({
                            courtId: court.id,
                            payload: {
                              name: window.prompt('Tên sân mới', court.name) || court.name,
                              location: window.prompt('Vị trí mới', court.location || '') || court.location
                            }
                          })
                        }
                        className='rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700'
                      >
                        Sửa
                      </button>
                      <button
                        type='button'
                        onClick={() => deleteCourtMutation.mutate(court.id)}
                        className='rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700'
                      >
                        Xóa mềm
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {selectedCourt ? (
        <section className='surface-card p-5'>
          <h3 className='text-lg font-semibold text-slate-900'>
            Quản lý slot: {selectedCourt.name} ({selectedCourt.location || 'Chưa cập nhật vị trí'})
          </h3>

          <form
            className='mt-4 grid gap-3 md:grid-cols-4'
            onSubmit={(event) => {
              event.preventDefault();
              createSlotMutation.mutate({
                courtId: selectedCourt.id,
                payload: {
                  label: slotForm.label || undefined,
                  startTime: slotForm.startTime,
                  endTime: slotForm.endTime,
                  priceCents: Number(slotForm.priceCents)
                }
              });
            }}
          >
            <input
              type='text'
              value={slotForm.label}
              onChange={(event) => setSlotForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder='Nhãn slot (tùy chọn)'
              className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
            />
            <input
              required
              type='time'
              value={slotForm.startTime}
              onChange={(event) => setSlotForm((prev) => ({ ...prev, startTime: event.target.value }))}
              className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
            />
            <input
              required
              type='time'
              value={slotForm.endTime}
              onChange={(event) => setSlotForm((prev) => ({ ...prev, endTime: event.target.value }))}
              className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
            />
            <div className='flex gap-2'>
              <input
                required
                type='number'
                min='1'
                value={slotForm.priceCents}
                onChange={(event) => setSlotForm((prev) => ({ ...prev, priceCents: event.target.value }))}
                placeholder='Giá (cents)'
                className='w-full rounded-xl border border-slate-200 px-3 py-2 text-sm'
              />
              <button
                type='submit'
                disabled={createSlotMutation.isPending}
                className='rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70'
              >
                Thêm
              </button>
            </div>
          </form>

          <div className='mt-4 overflow-hidden rounded-xl border border-slate-200'>
            <table className='min-w-full divide-y divide-slate-200 text-sm'>
              <thead className='bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Nhãn</th>
                  <th className='px-4 py-3'>Giờ</th>
                  <th className='px-4 py-3'>Giá</th>
                  <th className='px-4 py-3'>Trạng thái</th>
                  <th className='px-4 py-3'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100 bg-white'>
                {(selectedCourt.slots || []).map((slot) => (
                  <tr key={slot.id}>
                    <td className='px-4 py-3 text-slate-700'>{slot.label || '-'}</td>
                    <td className='px-4 py-3 text-slate-700'>
                      {slot.startTime} - {slot.endTime}
                    </td>
                    <td className='px-4 py-3 text-slate-700'>{formatCurrencyFromCents(slot.priceCents)}</td>
                    <td className='px-4 py-3 text-slate-700'>
                      {slot.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-wrap gap-2'>
                        <button
                          type='button'
                          onClick={() =>
                            updateSlotMutation.mutate({
                              courtId: selectedCourt.id,
                              slotId: slot.id,
                              payload: {
                                label: window.prompt('Nhãn mới', slot.label || '') || slot.label,
                                startTime: window.prompt('Giờ bắt đầu (HH:mm)', slot.startTime) || slot.startTime,
                                endTime: window.prompt('Giờ kết thúc (HH:mm)', slot.endTime) || slot.endTime,
                                priceCents: Number(window.prompt('Giá mới (cents)', String(slot.priceCents)) || slot.priceCents)
                              }
                            })
                          }
                          className='rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700'
                        >
                          Sửa
                        </button>
                        <button
                          type='button'
                          onClick={() =>
                            updateSlotMutation.mutate({
                              courtId: selectedCourt.id,
                              slotId: slot.id,
                              payload: { isActive: !slot.isActive }
                            })
                          }
                          className='rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700'
                        >
                          {slot.isActive ? 'Ẩn' : 'Kích hoạt'}
                        </button>
                        <button
                          type='button'
                          onClick={() =>
                            deleteSlotMutation.mutate({
                              courtId: selectedCourt.id,
                              slotId: slot.id
                            })
                          }
                          className='rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700'
                        >
                          Xóa mềm
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className='surface-card p-5 text-sm text-slate-600'>Chọn một sân để quản lý danh sách slot.</section>
      )}
    </div>
  );
}

export default AdminCourts;
