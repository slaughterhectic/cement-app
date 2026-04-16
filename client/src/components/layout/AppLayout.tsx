import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore, useSidebarStore } from '../../lib/store';
import { Toast } from '../ui/Toast';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const refreshPermissions = useAuthStore((s) => s.refreshPermissions);

  // Refresh permissions every 30 s so admin-granted access takes effect
  // without requiring the user to log out and back in
  useEffect(() => {
    refreshPermissions();
    const timer = setInterval(refreshPermissions, 30_000);
    return () => clearInterval(timer);
  }, [refreshPermissions]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <main
        className={`min-h-screen transition-[margin] duration-200 ease-out ${
          collapsed ? 'ml-[72px]' : 'ml-[220px]'
        }`}
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <Toast />
    </div>
  );
}
