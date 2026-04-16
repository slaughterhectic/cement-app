import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  display_name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  permissions: string[];
  setAuth: (token: string, user: User, permissions: string[]) => void;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  isAdmin: () => boolean;
  refreshPermissions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!localStorage.getItem('cb_token'),
  token: localStorage.getItem('cb_token'),
  user: (() => {
    try { return JSON.parse(localStorage.getItem('cb_user') || 'null'); } catch { return null; }
  })(),
  permissions: (() => {
    try { return JSON.parse(localStorage.getItem('cb_perms') || '[]'); } catch { return []; }
  })(),
  setAuth: (token, user, permissions) => {
    localStorage.setItem('cb_token', token);
    localStorage.setItem('cb_user', JSON.stringify(user));
    localStorage.setItem('cb_perms', JSON.stringify(permissions));
    set({ isAuthenticated: true, token, user, permissions });
  },
  logout: () => {
    localStorage.removeItem('cb_token');
    localStorage.removeItem('cb_user');
    localStorage.removeItem('cb_perms');
    set({ isAuthenticated: false, token: null, user: null, permissions: [] });
  },
  hasPermission: (perm) => {
    const state = get();
    if (state.user?.role === 'admin') return true;
    return state.permissions.includes(perm);
  },
  isAdmin: () => get().user?.role === 'admin',
  refreshPermissions: async () => {
    const { token, user } = get();
    if (!token || !user) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const perms: string[] = data.permissions ?? [];
      localStorage.setItem('cb_perms', JSON.stringify(perms));
      set({ permissions: perms });
    } catch {
      // silently ignore — stale permissions are better than crashing
    }
  },
}));

interface ToastState {
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
}));
