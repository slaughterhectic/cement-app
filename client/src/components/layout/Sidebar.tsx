import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  Landmark,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useSidebarStore } from '../../lib/store';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/stock', label: 'Stock', icon: Package },
  { to: '/parties', label: 'Parties', icon: Users },
  { to: '/dealers', label: 'Dealers', icon: Store },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/capital', label: 'Capital', icon: Wallet, permission: 'view_capital' },
  { to: '/finance', label: 'Finance', icon: Landmark, permission: 'view_finance' },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  { to: '/users', label: 'Users', icon: Shield, adminOnly: true },
];

export function Sidebar() {
  const navigate = useNavigate();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return user?.role === 'admin';
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const displayName = user?.display_name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-card-border bg-white transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[220px]'
      }`}
    >
      <div
        className={`flex shrink-0 items-center gap-2 border-b border-card-border py-4 ${
          collapsed ? 'justify-center px-2' : 'px-4'
        }`}
      >
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-brand-500/10 p-2 text-brand-500">
          <Building2 className="h-6 w-6" strokeWidth={2} />
        </div>
        {!collapsed && (
          <span className="truncate font-semibold tracking-tight text-heading">CementBook</span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-heading/80 hover:bg-surface hover:text-heading',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-card-border p-2">
        <button
          type="button"
          onClick={toggle}
          className={`mb-2 flex w-full items-center rounded-lg border border-card-border py-2 text-sm font-medium text-heading/70 transition-colors hover:bg-surface ${
            collapsed ? 'justify-center px-2' : 'justify-center gap-2 px-3'
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>

        <div
          className={`flex items-center gap-3 rounded-lg bg-surface/80 p-2 ${
            collapsed ? 'flex-col' : ''
          }`}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white"
            aria-hidden
          >
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-heading">{displayName}</p>
              <p className="truncate text-xs text-gray-500">{user?.role === 'admin' ? 'Admin' : 'User'}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-heading/60 transition-colors hover:bg-white hover:text-outstanding"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
