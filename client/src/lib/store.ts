import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: { name: string } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: localStorage.getItem('cb_auth') === '1',
  user: localStorage.getItem('cb_auth') === '1' ? { name: 'Admin' } : null,
  login: (username: string, password: string) => {
    if (username === 'admin' && password === 'cement123') {
      localStorage.setItem('cb_auth', '1');
      set({ isAuthenticated: true, user: { name: 'Admin' } });
      return true;
    }
    return false;
  },
  logout: () => {
    localStorage.removeItem('cb_auth');
    set({ isAuthenticated: false, user: null });
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
