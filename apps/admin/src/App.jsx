import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import SurveyDashboard from '@/pages/SurveyDashboard';
import RouteBuilder from '@/pages/RouteBuilder';
import InventoryManager from '@/pages/InventoryManager';
import LiveOps from '@/pages/LiveOps';
import Login from '@/pages/Login';
import PendingLocations from '@/pages/PendingLocations';
import ApartmentManager from '@/pages/ApartmentManager';
import OfficeManager from '@/pages/OfficeManager';
import Profile from '@/pages/Profile';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('tt_admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"                  element={<ProtectedRoute><SurveyDashboard /></ProtectedRoute>} />
      <Route path="/routes"            element={<ProtectedRoute><RouteBuilder /></ProtectedRoute>} />
      <Route path="/inventory"         element={<ProtectedRoute><InventoryManager /></ProtectedRoute>} />
      <Route path="/ops"               element={<ProtectedRoute><LiveOps /></ProtectedRoute>} />
      <Route path="/pending-locations" element={<ProtectedRoute><PendingLocations /></ProtectedRoute>} />
      <Route path="/apartments"        element={<ProtectedRoute><ApartmentManager /></ProtectedRoute>} />
      <Route path="/offices"           element={<ProtectedRoute><OfficeManager /></ProtectedRoute>} />
      <Route path="/profile"           element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    </Routes>
  );
}
