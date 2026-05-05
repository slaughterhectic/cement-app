import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  Fuel,
  ShieldCheck,
  Landmark,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Sun,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useMobileNavStore, useSidebarStore, useThemeStore } from '../../lib/store';
import { api } from '../../lib/api';

type Book = 'cement' | 'truck' | 'transport' | 'finance' | 'settings';

function detectBook(pathname: string): Book {
  if (pathname.startsWith('/truckbook')) return 'truck';
  if (pathname.startsWith('/transportbook')) return 'transport';
  if (pathname === '/capital' || pathname === '/finance' || pathname === '/assets') return 'finance';
  if (pathname === '/settings' || pathname === '/users') return 'settings';
  return 'cement';
}

const cementNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/stock', label: 'Stock', icon: Package },
  { to: '/parties', label: 'Parties', icon: Users },
  { to: '/freight-parties', label: 'Freight Parties', icon: Truck },
  { to: '/suspense', label: 'Suspense', icon: Wallet },
  { to: '/dealers', label: 'Dealers', icon: Store },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/bank-transfers', label: 'Bank Transfers', icon: Building2 },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/pending-approvals', label: 'Approvals', icon: ClipboardCheck, badgeKey: 'approvals' },
  { to: '/requests', label: 'Requests', icon: MessageSquare, badge: true },
];

const settingsNavItems = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/users', label: 'Users', icon: Shield },
];

const financeNavItems = [
  { to: '/capital', label: 'Capital', icon: Wallet, permission: 'view_capital' },
  { to: '/finance', label: 'Finance', icon: Landmark, permission: 'view_finance' },
  { to: '/assets', label: 'Assets', icon: Package, permission: 'view_finance' },
];

const truckNavItems = [
  { to: '/truckbook', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_truckbook_dashboard' },
  { to: '/truckbook/trucks', label: 'Trucks', icon: Truck, permission: 'view_truckbook_trucks' },
  { to: '/truckbook/trips', label: 'Trip Log', icon: FileText },
  { to: '/truckbook/trip-expenses', label: 'Trip Expenses', icon: Receipt },
  { to: '/truckbook/drivers', label: 'Drivers', icon: MapPin },
  { to: '/truckbook/transporters', label: 'Transporters', icon: Store },
  { to: '/truckbook/expenses', label: 'Truck Expenses', icon: Receipt },
  { to: '/truckbook/wallet', label: 'Wallet', icon: Wallet },
  { to: '/truckbook/fastags', label: 'FastTags', icon: CreditCard },
  { to: '/truckbook/pending-approvals', label: 'Approvals', icon: ClipboardCheck, badgeKey: 'approvals' },
  { to: '/truckbook/requests', label: 'Requests', icon: MessageSquare, badge: true },
];

const transportNavItems = [
  { to: '/transportbook', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transportbook/owners', label: 'Owners', icon: Users },
  { to: '/transportbook/trucks', label: 'Trucks', icon: Truck },
  { to: '/transportbook/trips', label: 'Trip Log', icon: FileText },
  { to: '/transportbook/invoices', label: 'ACC Billing', icon: Receipt },
  { to: '/transportbook/invoices?company=jk', label: 'JK Billing', icon: Receipt },
  { to: '/transportbook/diesel', label: 'Diesel', icon: Fuel },
  { to: '/transportbook/expenses', label: 'Expenses', icon: Receipt },
  { to: '/transportbook/compliance', label: 'Compliance', icon: ShieldCheck },
  { to: '/transportbook/partners', label: 'Partners', icon: Users },
  { to: '/transportbook/rates', label: 'Rates', icon: Settings, permission: 'manage_transport_rates' },
  { to: '/transportbook/pending-approvals', label: 'Approvals', icon: ClipboardCheck, badgeKey: 'approvals' },
  { to: '/transportbook/requests', label: 'Requests', icon: MessageSquare, badge: true },
];

const BOOK_META: Record<Book, { label: string; dot: string; activeClass: string; hoverClass: string; defaultRoute: string }> = {
  cement: {
    label: 'CementBook',
    dot: 'bg-brand-500',
    activeClass: 'bg-brand-500 text-white shadow-sm',
    hoverClass: 'hover:bg-surface hover:text-heading',
    defaultRoute: '/dashboard',
  },
  truck: {
    label: 'TruckBook',
    dot: 'bg-orange-500',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:text-orange-300',
    defaultRoute: '/truckbook',
  },
  finance: {
    label: 'FinanceBook',
    dot: 'bg-emerald-500',
    activeClass: 'bg-emerald-600 text-white shadow-sm',
    hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:text-emerald-300',
    defaultRoute: '/capital',
  },
  transport: {
    label: 'TransportBook',
    dot: 'bg-indigo-500',
    activeClass: 'bg-indigo-500 text-white shadow-sm',
    hoverClass: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:text-indigo-300',
    defaultRoute: '/transportbook',
  },
  settings: {
    label: 'User & Settings',
    dot: 'bg-violet-500',
    activeClass: 'bg-violet-600 text-white shadow-sm',
    hoverClass: 'hover:bg-violet-50 hover:text-violet-700',
    defaultRoute: '/settings',
  },
};

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const mobileOpen = useMobileNavStore((s) => s.open);
  const setMobileOpen = useMobileNavStore((s) => s.setOpen);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [book, setBook] = useState<Book>(() => detectBook(location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Track viewport so `collapsed` only applies on md+ screens
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // On mobile the drawer is always expanded — collapsed only takes effect on md+
  const effectiveCollapsed = collapsed && !isMobile;

  // Auto-switch book when navigating directly to a URL
  useEffect(() => {
    setBook(detectBook(location.pathname));
  }, [location.pathname]);

  // Close mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [location.pathname, setMobileOpen]);

  // Poll pending request count for badge — scoped to current book
  useEffect(() => {
    let active = true;
    const source = book === 'truck' ? 'truckbook' : book === 'transport' ? 'transportbook' : 'cementbook';
    const fetchCount = async () => {
      try {
        const rows: any[] = await api.requests.list(source);
        if (active) setPendingCount(rows.filter((r) => r.status === 'pending').length);
      } catch (_) {}
    };
    fetchCount();
    const timer = setInterval(fetchCount, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [book]);

  // Poll pending approvals count for badge — scoped to current book
  useEffect(() => {
    let active = true;
    const source = book === 'truck' ? 'truckbook' : book === 'transport' ? 'transportbook' : 'cementbook';
    const fetchApprovals = async () => {
      try {
        const res = await api.pendingEntries.count(source);
        if (active) setApprovalsCount(res.count);
      } catch (_) {}
    };
    fetchApprovals();
    const timer = setInterval(fetchApprovals, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [book]);

  // Close book menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const switchBook = (b: Book) => {
    setBook(b);
    setMenuOpen(false);
    navigate(BOOK_META[b].defaultRoute);
  };

  const canSeeFinance = isAdmin() || hasPermission('view_capital') || hasPermission('view_finance');

  const availableBooks: Book[] = [
    ...(isAdmin() || hasPermission('access_cementbook') ? (['cement'] as Book[]) : []),
    ...(isAdmin() || hasPermission('access_truckbook') ? (['truck'] as Book[]) : []),
    ...(isAdmin() || hasPermission('access_transportbook') ? (['transport'] as Book[]) : []),
    ...(canSeeFinance ? (['finance'] as Book[]) : []),
    ...(isAdmin() ? (['settings'] as Book[]) : []),
  ];

  const navItems = (book === 'cement'
    ? cementNavItems.filter((item) => {
        if ((item as any).permission) return hasPermission((item as any).permission);
        return true;
      })
    : book === 'finance'
    ? financeNavItems.filter((item) => {
        if ((item as any).permission) return hasPermission((item as any).permission);
        return true;
      })
    : book === 'settings'
    ? settingsNavItems
    : book === 'transport'
    ? transportNavItems.filter((item) => {
        if ((item as any).permission) return isAdmin() || hasPermission((item as any).permission);
        return true;
      })
    : truckNavItems.filter((item) => {
        if ((item as any).permission) return isAdmin() || hasPermission((item as any).permission);
        return true;
      })) as Array<{ to: string; label: string; icon: any; badge?: boolean; badgeKey?: string; permission?: string }>;

  const meta = BOOK_META[book];
  const displayName = user?.display_name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // On mobile the drawer is always the full 220px width; `collapsed` only applies at md+.
  const widthClass = `w-[220px] ${collapsed ? 'md:w-[72px]' : 'md:w-[220px]'}`;
  const mobileVisibility = mobileOpen
    ? 'translate-x-0'
    : '-translate-x-full md:translate-x-0';

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-card-border bg-card transition-transform duration-200 ease-out md:transition-[width] ${widthClass} ${mobileVisibility}`}
    >
      {/* Logo */}
      <div
        className={`flex shrink-0 items-center gap-2 border-b border-card-border py-4 ${
          effectiveCollapsed ? 'justify-center px-2' : 'px-4'
        }`}
      >
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-brand-500/10 p-2 text-brand-500">
          <Building2 className="h-6 w-6" strokeWidth={2} />
        </div>
        {!effectiveCollapsed && (
          <span className="truncate font-semibold tracking-tight text-heading">
            <span className="text-brand-500">arm</span>tech
          </span>
        )}
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-heading/60 transition-colors hover:bg-surface md:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Book Switcher */}
      <div className={`shrink-0 border-b border-card-border ${effectiveCollapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
        {effectiveCollapsed ? (
          <div
            className={`mx-auto h-3 w-3 rounded-full ${meta.dot}`}
            title={meta.label}
          />
        ) : (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg border border-card-border bg-surface px-3 py-2 text-xs font-semibold text-heading/80 transition-colors hover:bg-card-border/40"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-heading/50 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-card-border bg-card shadow-lg overflow-hidden">
                {availableBooks.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => switchBook(b)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                      b === book ? 'bg-surface text-heading' : 'text-heading/70 hover:bg-surface'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${BOOK_META[b].dot}`} />
                    {BOOK_META[b].label}
                    {b === book && <span className="ml-auto text-heading/50">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {navItems.map(({ to, label, icon: Icon, badge, badgeKey }) => {
          const badgeCount = badgeKey === 'approvals' ? approvalsCount : (badge ? pendingCount : 0);
          // For sibling nav items that share a pathname but differ on query string
          // (e.g. ACC Billing vs JK Billing) NavLink's default active match ignores
          // the search portion, so both would highlight at once. Compare query
          // strings too when the nav target carries one.
          const [navPath, navSearch = ''] = to.split('?');
          const isCustomActive = navSearch
            ? location.pathname === navPath && location.search === '?' + navSearch
            : null;
          return (
          <NavLink
            key={to}
            to={to}
            end={to === '/truckbook' || to === '/dashboard' || to === '/transportbook'}
            title={effectiveCollapsed ? label : undefined}
            className={({ isActive }) => {
              // For pathname-only nav items that have a query-string sibling, treat them
              // as active only when the URL has no query — otherwise they'd both light up.
              const siblingHasQuery = navItems.some((n) => {
                const [p, s = ''] = n.to.split('?');
                return p === navPath && s !== navSearch;
              });
              const computedActive = isCustomActive !== null
                ? isCustomActive
                : siblingHasQuery
                  ? isActive && location.search === ''
                  : isActive;
              return [
                'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors',
                effectiveCollapsed ? 'justify-center px-2' : 'px-3',
                computedActive ? meta.activeClass : `text-heading/80 ${meta.hoverClass}`,
              ].join(' ');
            }}
          >
            <div className="relative shrink-0">
              <Icon className="h-5 w-5" strokeWidth={2} />
              {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </div>
            {!effectiveCollapsed && <span className="truncate flex-1">{label}</span>}
            {!effectiveCollapsed && badgeCount > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badgeCount}
              </span>
            )}
          </NavLink>
        );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-card-border p-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`mb-2 flex w-full items-center rounded-lg border border-card-border py-2 text-sm font-medium text-heading/80 transition-colors hover:bg-surface ${
            effectiveCollapsed ? 'justify-center px-2' : 'justify-center gap-2 px-3'
          }`}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!effectiveCollapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* Collapse button — desktop only */}
        <button
          type="button"
          onClick={toggle}
          className={`mb-2 hidden w-full items-center rounded-lg border border-card-border py-2 text-sm font-medium text-heading/70 transition-colors hover:bg-surface md:flex ${
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
            effectiveCollapsed ? 'flex-col' : ''
          }`}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white"
            aria-hidden
          >
            {initial}
          </div>
          {!effectiveCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-heading">{displayName}</p>
              <p className="truncate text-xs text-heading/60">{user?.role === 'admin' ? 'Admin' : 'User'}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-heading/60 transition-colors hover:bg-card hover:text-outstanding"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
