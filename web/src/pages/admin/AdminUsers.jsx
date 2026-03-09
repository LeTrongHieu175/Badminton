import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUserRole } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';

function extractErrorMessage(error) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || 'Unable to update role.';
}

function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleRoleChange = (userId, nextRole) => {
    roleMutation.mutate({ userId, role: nextRole });
  };

  return (
    <div className='surface-card p-5'>
      <h2 className='text-xl font-semibold text-slate-900'>Users</h2>
      <p className='mt-1 text-sm text-slate-600'>Admin can assign role: admin or user.</p>

      {roleMutation.isError ? (
        <div className='mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
          {extractErrorMessage(roleMutation.error)}
        </div>
      ) : null}

      {isLoading ? (
        <p className='mt-4 text-sm text-slate-500'>Loading users...</p>
      ) : (
        <div className='mt-4 overflow-hidden rounded-xl border border-slate-200'>
          <table className='min-w-full divide-y divide-slate-200 text-sm'>
            <thead className='bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500'>
              <tr>
                <th className='px-4 py-3'>Username</th>
                <th className='px-4 py-3'>Mail</th>
                <th className='px-4 py-3'>Phone</th>
                <th className='px-4 py-3'>Role</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 bg-white'>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className='px-4 py-3 font-medium text-slate-900'>{user.username || user.name}</td>
                  <td className='px-4 py-3 text-slate-600'>{user.email}</td>
                  <td className='px-4 py-3 text-slate-600'>{user.phone || '-'}</td>
                  <td className='px-4 py-3'>
                    <select
                      value={user.role}
                      disabled={roleMutation.isPending || currentUser?.id === user.id}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      className='rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-70'
                    >
                      <option value='user'>user</option>
                      <option value='admin'>admin</option>
                    </select>
                    {currentUser?.id === user.id ? (
                      <p className='mt-1 text-[11px] text-slate-400'>current account</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
