import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import VehicleListPage from './pages/VehicleListPage';
import VehicleFormPage from './pages/VehicleFormPage';
import MaintenanceListPage from './pages/MaintenanceListPage';
import MaintenanceFormPage from './pages/MaintenanceFormPage';
import DistributionPage from './pages/DistributionPage';
import TransferFormPage from './pages/TransferFormPage';
import PendingRequestsPage from './pages/PendingRequestsPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="vehicles" element={<VehicleListPage />} />
            <Route path="vehicles/new" element={<VehicleFormPage />} />
            <Route path="vehicles/:id" element={<VehicleFormPage />} />
            <Route path="maintenance" element={<MaintenanceListPage />} />
            <Route path="maintenance/new" element={<MaintenanceFormPage />} />
            <Route path="maintenance/:id" element={<MaintenanceFormPage />} />
            <Route path="distribution" element={<DistributionPage />} />
            <Route path="distribution/new" element={<TransferFormPage />} />
            <Route path="pending" element={<PendingRequestsPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
