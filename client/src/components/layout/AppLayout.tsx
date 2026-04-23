import { useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useAuthStore, useMobileNavStore, useSidebarStore } from '../../lib/store';
import { Toast } from '../ui/Toast';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const mobileOpen = useMobileNavStore((s) => s.open);
  const setMobileOpen = useMobileNavStore((s) => s.setOpen);
  const refreshPermissions = useAuthStore((s) => s.refreshPermissions);

  // Refresh permissions every 30 s so admin-granted access takes effect
  // without requiring the user to log out and back in
  useEffect(() => {
    refreshPermissions();
    const timer = setInterval(refreshPermissions, 30_000);
    return () => clearInterval(timer);
  }, [refreshPermissions]);

  // Close the drawer automatically if the viewport grows past the mobile breakpoint
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setMobileOpen]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main
        className={`min-h-screen transition-[margin] duration-200 ease-out ${
          collapsed ? 'md:ml-[72px]' : 'md:ml-[220px]'
        }`}
      >
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-card-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-card-border p-2 text-heading transition-colors hover:bg-surface"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-heading">
            <span className="text-brand-500">arm</span>tech
          </span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <Toast />
    </div>
  );
}
