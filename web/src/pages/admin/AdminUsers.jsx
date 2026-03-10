import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deactivateUser, getUsers, updateUser } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../utils/errors';
import { formatRoleLabel } from '../../utils/formatters';
import { useState } from 'react';

function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    fullName: '',
    role: 'user'
  });

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateForm({ username: '', email: '', phone: '', password: '', fullName: '', role: 'user' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }) => updateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId) => deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const hasMutationError = createMutation.isError || updateMutation.isError || deactivateMutation.isError;
  const mutationError = createMutation.error || updateMutation.error || deactivateMutation.error;

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>Người dùng</h2>
        <p className='mt-1 text-sm text-slate-600'>Tạo, chỉnh sửa, phân quyền và vô hiệu hóa tài khoản.</p>

        <form
          className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate(createForm);
          }}
        >
          <input
            required
            type='text'
            value={createForm.username}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
            placeholder='Username'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />
          <input
            type='text'
            value={createForm.fullName}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))}
            placeholder='Họ và tên (tùy chọn)'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />
          <input
            required
            type='email'
            value={createForm.email}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder='Email'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />
          <input
            required
            type='text'
            value={createForm.phone}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder='Số điện thoại'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />
          <input
            required
            type='password'
            minLength={6}
            value={createForm.password}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder='Mật khẩu'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />
          <div className='flex gap-2'>
            <select
              value={createForm.role}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}
              className='w-full rounded-xl border border-slate-200 px-3 py-2 text-sm'
            >
              <option value='user'>Người dùng</option>
              <option value='admin'>Quản trị viên</option>
            </select>
            <button
              type='submit'
              disabled={createMutation.isPending}
              className='rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70'
            >
              Tạo
            </button>
          </div>
        </form>
      </section>

      {hasMutationError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(mutationError, 'Không thể cập nhật người dùng.')}
        </div>
      ) : null}

      {isLoading ? <p className='text-sm text-slate-500'>Đang tải danh sách người dùng...</p> : null}

      {isError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(error, 'Không tải được danh sách người dùng.')}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <section className='surface-card overflow-hidden p-0'>
          <table className='min-w-full divide-y divide-slate-200 text-sm'>
            <thead className='bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500'>
              <tr>
                <th className='px-4 py-3'>Username</th>
                <th className='px-4 py-3'>Họ và tên</th>
                <th className='px-4 py-3'>Email</th>
                <th className='px-4 py-3'>Điện thoại</th>
                <th className='px-4 py-3'>Vai trò</th>
                <th className='px-4 py-3'>Trạng thái</th>
                <th className='px-4 py-3'>Thao tác</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 bg-white'>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className='px-4 py-3 font-medium text-slate-900'>{user.username}</td>
                  <td className='px-4 py-3 text-slate-700'>{user.fullName || '-'}</td>
                  <td className='px-4 py-3 text-slate-700'>{user.email}</td>
                  <td className='px-4 py-3 text-slate-700'>{user.phone || '-'}</td>
                  <td className='px-4 py-3 text-slate-700'>{formatRoleLabel(user.role)}</td>
                  <td className='px-4 py-3 text-slate-700'>{user.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</td>
                  <td className='px-4 py-3'>
                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() =>
                          updateMutation.mutate({
                            userId: user.id,
                            payload: {
                              role: user.role === 'admin' ? 'user' : 'admin'
                            }
                          })
                        }
                        disabled={currentUser?.id === user.id}
                        className='rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        {user.role === 'admin' ? 'Đổi sang user' : 'Đổi sang admin'}
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          updateMutation.mutate({
                            userId: user.id,
                            payload: {
                              fullName: window.prompt('Họ và tên mới', user.fullName || '') || user.fullName,
                              phone: window.prompt('Số điện thoại mới', user.phone || '') || user.phone,
                              email: window.prompt('Email mới', user.email) || user.email,
                              username: window.prompt('Username mới', user.username) || user.username
                            }
                          })
                        }
                        className='rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700'
                      >
                        Sửa
                      </button>
                      <button
                        type='button'
                        disabled={!user.isActive}
                        onClick={() => deactivateMutation.mutate(user.id)}
                        className='rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Vô hiệu hóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

export default AdminUsers;
