import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const PAGE_TITLES = {
  '/admin': 'Tổng quan',
  '/admin/courts': 'Quản lý sân',
  '/admin/bookings': 'Đơn đặt sân',
  '/admin/users': 'Người dùng',
  '/admin/analytics': 'Phân tích',
  '/admin/ai-insights': 'Gợi ý AI',
  '/admin/settings': 'Cài đặt'
};

function AdminLayout() {
  const { isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = useMemo(
    () => PAGE_TITLES[location.pathname] || 'Bảng điều khiển quản trị',
    [location.pathname]
  );

  if (isLoading) {
    return <p className='p-6 text-sm text-slate-500'>Đang xác thực...</p>;
  }

  if (!isAdmin) {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='flex min-h-screen bg-slate-100'>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='flex min-h-screen flex-1 flex-col'>
        <Navbar title={title} onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main className='flex-1 p-4 sm:p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
