import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
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
import Assets from './pages/Assets';
import SuspensePage from './pages/Suspense';
import BankTransfers from './pages/BankTransfers';
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
import Wallet from './pages/truckbook/Wallet';
import Fastags from './pages/truckbook/Fastags';
import Requests from './pages/Requests';
import Transporters from './pages/truckbook/Transporters';
import PendingApprovals from './pages/PendingApprovals';
import TransportDashboard from './pages/transportbook/TransportDashboard';
import TruckOwners from './pages/transportbook/TruckOwners';
import TruckOwnerLedger from './pages/transportbook/TruckOwnerLedger';
import TransportOwners from './pages/transportbook/TransportOwners';
import OwnerLedger from './pages/transportbook/OwnerLedger';
import TransportTrips from './pages/transportbook/TransportTrips';
import TransportInvoices from './pages/transportbook/TransportInvoices';
import TransportPartners from './pages/transportbook/TransportPartners';
import TransportSettings from './pages/transportbook/TransportSettings';
import TransportCompliance from './pages/transportbook/TransportCompliance';
import DieselParties from './pages/transportbook/DieselParties';
import { Building2, Truck, LogOut } from 'lucide-react';

function Protected({ children }: { children: ReactNode }) {
  const ok = useAuthStore((s) => s.isAuthenticated);
  if (!ok) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function HasAccess({ permission, children }: { permission: string; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin() && !hasPermission(permission)) return <Navigate to="/no-access" replace />;
  return <>{children}</>;
}

function BookGuard({ permission, fallback, children }: { permission: string; fallback: string; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin() && !hasPermission(permission)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin()) return <Navigate to="/no-access" replace />;
  return <>{children}</>;
}

function NoAccessPage() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
          <div className="flex gap-2">
            <Building2 className="h-7 w-7 text-heading/40" />
            <Truck className="h-7 w-7 text-heading/40" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-heading/90">No Pages Assigned</h1>
        <p className="mt-2 text-sm text-gray-500">
          Hi <span className="font-medium text-gray-700">{user?.display_name || 'there'}</span>, your account doesn't have access to any section yet.
        </p>
        <p className="mt-1 text-sm text-gray-500">Please contact the admin to get access.</p>
        <button
          type="button"
          onClick={() => { logout(); navigate('/login'); }}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* No-access page — authenticated but no book assigned */}
        <Route path="/no-access" element={<Protected><NoAccessPage /></Protected>} />
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          {/* CementBook routes — require access_cementbook */}
          <Route path="/dashboard" element={<BookGuard permission="access_cementbook" fallback="/no-access"><BookGuard permission="view_dashboard" fallback="/purchases"><Dashboard /></BookGuard></BookGuard>} />
          <Route path="/purchases" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Purchases /></BookGuard>} />
          <Route path="/sales" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Sales /></BookGuard>} />
          <Route path="/stock" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Stock /></BookGuard>} />
          <Route path="/parties" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Parties /></BookGuard>} />
          <Route path="/suspense" element={<BookGuard permission="access_cementbook" fallback="/no-access"><SuspensePage /></BookGuard>} />
          <Route path="/bank-transfers" element={<BookGuard permission="access_cementbook" fallback="/no-access"><BankTransfers /></BookGuard>} />
          <Route path="/parties/:id" element={<BookGuard permission="access_cementbook" fallback="/no-access"><PartyLedger /></BookGuard>} />
          <Route path="/dealers" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Dealers /></BookGuard>} />
          <Route path="/dealers/:id" element={<BookGuard permission="access_cementbook" fallback="/no-access"><DealerDetail /></BookGuard>} />
          <Route path="/payments" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Payments /></BookGuard>} />
          <Route path="/expenses" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Expenses /></BookGuard>} />
          <Route path="/reports" element={<BookGuard permission="access_cementbook" fallback="/no-access"><Reports /></BookGuard>} />
          <Route path="/capital" element={<BookGuard permission="access_cementbook" fallback="/no-access"><HasAccess permission="view_capital"><Capital /></HasAccess></BookGuard>} />
          <Route path="/finance" element={<BookGuard permission="access_cementbook" fallback="/no-access"><HasAccess permission="view_finance"><Finance /></HasAccess></BookGuard>} />
          <Route path="/assets" element={<BookGuard permission="access_cementbook" fallback="/no-access"><HasAccess permission="view_finance"><Assets /></HasAccess></BookGuard>} />
          <Route path="/import" element={<BookGuard permission="access_cementbook" fallback="/no-access"><ImportPage /></BookGuard>} />
          {/* TruckBook routes — require access_truckbook */}
          <Route path="/truckbook" element={<BookGuard permission="access_truckbook" fallback="/no-access"><BookGuard permission="view_truckbook_dashboard" fallback="/truckbook/trucks"><TruckDashboard /></BookGuard></BookGuard>} />
          <Route path="/truckbook/trucks" element={<BookGuard permission="access_truckbook" fallback="/no-access"><Trucks /></BookGuard>} />
          <Route path="/truckbook/trips" element={<BookGuard permission="access_truckbook" fallback="/no-access"><TripLog /></BookGuard>} />
          <Route path="/truckbook/drivers" element={<BookGuard permission="access_truckbook" fallback="/no-access"><DriverLedger /></BookGuard>} />
          <Route path="/truckbook/expenses" element={<BookGuard permission="access_truckbook" fallback="/no-access"><TruckExpenses /></BookGuard>} />
          <Route path="/truckbook/transporters" element={<BookGuard permission="access_truckbook" fallback="/no-access"><Transporters /></BookGuard>} />
          <Route path="/truckbook/wallet" element={<BookGuard permission="access_truckbook" fallback="/no-access"><Wallet /></BookGuard>} />
          <Route path="/truckbook/fastags" element={<BookGuard permission="access_truckbook" fallback="/no-access"><Fastags /></BookGuard>} />
          {/* TransportBook routes — require access_transportbook */}
          <Route path="/transportbook" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TransportDashboard /></BookGuard>} />
          <Route path="/transportbook/trucks" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TruckOwners /></BookGuard>} />
          <Route path="/transportbook/trucks/:id" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TruckOwnerLedger /></BookGuard>} />
          <Route path="/transportbook/owners" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TransportOwners /></BookGuard>} />
          <Route path="/transportbook/owners/:name" element={<BookGuard permission="access_transportbook" fallback="/no-access"><OwnerLedger /></BookGuard>} />
          <Route path="/transportbook/trips" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TransportTrips /></BookGuard>} />
          <Route path="/transportbook/invoices" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TransportInvoices /></BookGuard>} />
          <Route path="/transportbook/partners" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TransportPartners /></BookGuard>} />
          <Route path="/transportbook/rates" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TransportSettings /></BookGuard>} />
          <Route path="/transportbook/compliance" element={<BookGuard permission="access_transportbook" fallback="/no-access"><TransportCompliance /></BookGuard>} />
          <Route path="/transportbook/diesel" element={<BookGuard permission="access_transportbook" fallback="/no-access"><DieselParties /></BookGuard>} />
          {/* CementBook requests/approvals */}
          <Route path="/requests" element={<Requests source="cementbook" />} />
          <Route path="/pending-approvals" element={<PendingApprovals source="cementbook" />} />
          {/* TruckBook requests/approvals */}
          <Route path="/truckbook/requests" element={<BookGuard permission="access_truckbook" fallback="/no-access"><Requests source="truckbook" /></BookGuard>} />
          <Route path="/truckbook/pending-approvals" element={<BookGuard permission="access_truckbook" fallback="/no-access"><PendingApprovals source="truckbook" /></BookGuard>} />
          {/* TransportBook requests/approvals */}
          <Route path="/transportbook/requests" element={<BookGuard permission="access_transportbook" fallback="/no-access"><Requests source="transportbook" /></BookGuard>} />
          <Route path="/transportbook/pending-approvals" element={<BookGuard permission="access_transportbook" fallback="/no-access"><PendingApprovals source="transportbook" /></BookGuard>} />
          {/* Admin only */}
          <Route path="/settings" element={<AdminOnly><Settings /></AdminOnly>} />
          <Route path="/users" element={<AdminOnly><UserManagement /></AdminOnly>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
