import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/courts': 'Courts',
  '/admin/bookings': 'Bookings',
  '/admin/users': 'Users',
  '/admin/analytics': 'Analytics',
  '/admin/ai-insights': 'AI Insights',
  '/admin/settings': 'Settings'
};

function AdminLayout() {
  const { isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = useMemo(
    () => PAGE_TITLES[location.pathname] || 'Admin Dashboard',
    [location.pathname]
  );

  if (isLoading) {
    return <p className='p-6 text-sm text-slate-500'>Authenticating...</p>;
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
