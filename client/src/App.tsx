import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Stock from './pages/Stock';
import Parties from './pages/Parties';
import PartyLedger from './pages/PartyLedger';
import Dealers from './pages/Dealers';
import DealerDetail from './pages/DealerDetail';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Capital from './pages/Capital';
import Finance from './pages/Finance';
import ImportPage from './pages/Import';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import { useAuthStore } from './lib/store';
import TruckDashboard from './pages/truckbook/TruckDashboard';
import Trucks from './pages/truckbook/Trucks';
import TripLog from './pages/truckbook/TripLog';
import DriverLedger from './pages/truckbook/DriverLedger';
import TruckExpenses from './pages/truckbook/TruckExpenses';

function Protected({ children }: { children: ReactNode }) {
  const ok = useAuthStore((s) => s.isAuthenticated);
  if (!ok) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function HasAccess({ permission, children }: { permission: string; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (!hasPermission(permission)) return <Navigate to="/purchases" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin()) return <Navigate to="/purchases" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route path="/dashboard" element={<HasAccess permission="view_dashboard"><Dashboard /></HasAccess>} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/:id" element={<PartyLedger />} />
          <Route path="/dealers" element={<Dealers />} />
          <Route path="/dealers/:id" element={<DealerDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/capital" element={<HasAccess permission="view_capital"><Capital /></HasAccess>} />
          <Route path="/finance" element={<HasAccess permission="view_finance"><Finance /></HasAccess>} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/settings" element={<AdminOnly><Settings /></AdminOnly>} />
          <Route path="/users" element={<AdminOnly><UserManagement /></AdminOnly>} />
          {/* TruckBook routes */}
          <Route path="/truckbook" element={<TruckDashboard />} />
          <Route path="/truckbook/trucks" element={<Trucks />} />
          <Route path="/truckbook/trips" element={<TripLog />} />
          <Route path="/truckbook/drivers" element={<DriverLedger />} />
          <Route path="/truckbook/expenses" element={<TruckExpenses />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
