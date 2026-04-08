import { Outlet } from 'react-router-dom';
import { useSidebarStore } from '../../lib/store';
import { Toast } from '../ui/Toast';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const collapsed = useSidebarStore((s) => s.collapsed);

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
