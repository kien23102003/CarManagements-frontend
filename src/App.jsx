import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
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
import VehicleCostStatsPage from './pages/VehicleCostStatsPage';
import ProposalListPage from './pages/ProposalListPage';
import CreateProposalPage from './pages/CreateProposalPage';
import AssetCreatePage from './pages/AssetCreatePage';
import VehicleAssignmentPage from './pages/VehicleAssignmentPage';
import TripLogsPage from "./pages/TripLogsPage";
import VerifySuccessPage from './pages/VerifySuccessPage';
import VerifyFailedPage from './pages/VerifyFailedPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import SetNewPasswordPage from './pages/SetNewPasswordPage';
import AccessoryListPage from './pages/AccessoryListPage';
import AccessoryFormPage from './pages/AccessoryFormPage';
import AccessoryIssuePage from './pages/AccessoryIssuePage';
import VehicleAccessoriesPage from './pages/VehicleAccessoriesPage';
import AccessoryTransactionsPage from './pages/AccessoryTransactionsPage';
import BranchAccessoryStockPage from './pages/BranchAccessoryStockPage';
import AccessoryPurchaseRequestListPage from './pages/AccessoryPurchaseRequestListPage';
import AccessoryPurchaseRequestDetailPage from './pages/AccessoryPurchaseRequestDetailPage';
import AccessoryGoodsReceiptListPage from './pages/AccessoryGoodsReceiptListPage';
import AccessoryGoodsReceiptDetailPage from './pages/AccessoryGoodsReceiptDetailPage';
import VehicleAccessoryRequirementsPage from './pages/VehicleAccessoryRequirementsPage';
import DisposalProposalListPage from './pages/DisposalProposalListPage';
import DisposalProposalDetailPage from './pages/DisposalProposalDetailPage';
import DisposalProposalCreatePage from './pages/DisposalProposalCreatePage';
import VehicleDisposalHistoryPage from './pages/VehicleDisposalHistoryPage';
import DriverListPage from './pages/DriverListPage';
import DriverFormPage from './pages/DriverFormPage';


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/set-new-password" element={<SetNewPasswordPage />} />
          <Route path="/verify-success" element={<VerifySuccessPage />} />
          <Route path="/verify-failed" element={<VerifyFailedPage />} />
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />

            <Route path="profile" element={<ProfilePage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />

            <Route path="vehicles" element={<VehicleListPage />} />
            <Route path="vehicles/new" element={<VehicleFormPage />} />
            <Route path="vehicles/:id" element={<VehicleFormPage />} />
            <Route path="vehicles/asset-create" element={<AssetCreatePage />} />
            <Route path="vehicles/assignment" element={<VehicleAssignmentPage />} />
            <Route path="vehicles/:vehicleId/accessories" element={<VehicleAccessoriesPage />} />
            <Route path="vehicles/:vehicleId/disposal-proposals" element={<VehicleDisposalHistoryPage />} />
            <Route path="drivers" element={<DriverListPage />} />
            <Route path="drives" element={<Navigate to="/drivers" replace />} />
            <Route path="drivers/new" element={<DriverFormPage />} />
            <Route path="drivers/:id/edit" element={<DriverFormPage />} />


            <Route path="accessories" element={<AccessoryListPage />} />
            <Route path="accessories/new" element={<AccessoryFormPage />} />
            <Route path="accessories/:id" element={<AccessoryFormPage />} />
            <Route path="accessories/issue" element={<AccessoryIssuePage />} />
            <Route path="branch-accessory-stock" element={<BranchAccessoryStockPage />} />
            <Route path="accessory-purchase-requests" element={<AccessoryPurchaseRequestListPage />} />
            <Route path="accessory-purchase-requests/:id" element={<AccessoryPurchaseRequestDetailPage />} />
            <Route path="accessory-goods-receipts" element={<AccessoryGoodsReceiptListPage />} />
            <Route path="accessory-goods-receipts/:id" element={<AccessoryGoodsReceiptDetailPage />} />
            <Route path="vehicle-accessory-requirements" element={<VehicleAccessoryRequirementsPage />} />
            <Route path="accessory-transactions" element={<AccessoryTransactionsPage />} />

            <Route path="maintenance" element={<MaintenanceListPage />} />
            <Route path="maintenance/new" element={<MaintenanceFormPage />} />
            <Route path="maintenance/:id" element={<MaintenanceFormPage />} />

            <Route path="distribution" element={<DistributionPage />} />
            <Route path="distribution/new" element={<TransferFormPage />} />

            <Route path="pending" element={<PendingRequestsPage />} />
            <Route path="hr-management" element={<HrManagementPage />} />
            <Route path="estimated-costs" element={<EstimatedCostPage />} />

            <Route path="vehicle-stats" element={<VehicleCostStatsPage />} />

            <Route path="proposals" element={<ProposalListPage />} />
            <Route path="proposals/create" element={<CreateProposalPage />} />
            <Route path="proposals/edit/:id" element={<CreateProposalPage />} />
            <Route path="disposal-proposals" element={<DisposalProposalListPage />} />
            <Route path="disposal-proposals/new" element={<DisposalProposalCreatePage />} />
            <Route path="disposal-proposals/:id" element={<DisposalProposalDetailPage />} />

            {/* NEW */}
            <Route path="trip-logs" element={<TripLogsPage />} />

          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
