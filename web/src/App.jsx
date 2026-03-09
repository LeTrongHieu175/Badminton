import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import Home from './pages/Home';
import CourtList from './pages/CourtList';
import CourtBooking from './pages/CourtBooking';
import UserDashboard from './pages/UserDashboard';
import BookingHistory from './pages/BookingHistory';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCourts from './pages/admin/AdminCourts';
import AdminBookings from './pages/admin/AdminBookings';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAIInsights from './pages/admin/AdminAIInsights';
import AdminSettings from './pages/admin/AdminSettings';
import { useAuth } from './contexts/AuthContext';

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p className='p-6 text-sm text-slate-500'>Authenticating...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to='/' replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path='/' element={<Home />} />
        <Route path='/courts' element={<CourtList />} />
        <Route
          path='/courts/:id/booking'
          element={
            <RequireAuth>
              <CourtBooking />
            </RequireAuth>
          }
        />
        <Route
          path='/dashboard'
          element={
            <RequireAuth>
              <UserDashboard />
            </RequireAuth>
          }
        />
        <Route
          path='/bookings'
          element={
            <RequireAuth>
              <BookingHistory />
            </RequireAuth>
          }
        />
        <Route
          path='/profile'
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
      </Route>

      <Route path='/admin' element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path='courts' element={<AdminCourts />} />
        <Route path='bookings' element={<AdminBookings />} />
        <Route path='users' element={<AdminUsers />} />
        <Route path='analytics' element={<AdminAnalytics />} />
        <Route path='ai-insights' element={<AdminAIInsights />} />
        <Route path='settings' element={<AdminSettings />} />
      </Route>

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

export default App;
