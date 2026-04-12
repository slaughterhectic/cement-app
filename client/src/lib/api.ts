const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('cb_token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, { headers, ...options });
  if (res.status === 401) {
    localStorage.removeItem('cb_token');
    localStorage.removeItem('cb_user');
    localStorage.removeItem('cb_perms');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: any; permissions: string[] }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ username, password }),
      }),
    me: () => request<{ user: any; permissions: string[] }>('/auth/me'),
    listUsers: () => request<any[]>('/auth/users'),
    createUser: (data: { username: string; password: string; display_name: string; role: string }) =>
      request<any>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
    deleteUser: (id: number) => request<any>(`/auth/users/${id}`, { method: 'DELETE' }),
    updatePermissions: (id: number, permissions: string[]) =>
      request<any>(`/auth/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  },
  backup: {
    download: async () => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${BASE}/backup`, { headers });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'cementbook-backup.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    },
  },
  dashboard: {
    stats: () => request<any>('/dashboard/stats'),
    charts: () => request<any>('/dashboard/charts'),
  },
  purchases: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/purchases${q}`);
    },
    create: (data: any) => request<any>('/purchases', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/purchases/${id}`, { method: 'DELETE' }),
    suppliers: () => request<string[]>('/purchases/suppliers'),
    rates: (brandId: number) => request<any[]>(`/purchases/rates/${brandId}`),
  },
  sales: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/sales${q}`);
    },
    create: (data: any) => request<any>('/sales', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/sales/${id}`, { method: 'DELETE' }),
    setReceived: (id: number, received: boolean) => request<any>(`/sales/${id}/received`, { method: 'PATCH', body: JSON.stringify({ received }) }),
    stock: (brandId: number, godownId?: number) => {
      const q = godownId ? `?godown_id=${godownId}` : '';
      return request<{ stock: number }>(`/sales/stock/${brandId}${q}`);
    },
  },
  stock: {
    list: () => request<any[]>('/stock'),
    movement: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/stock/movement${q}`);
    },
    godown: () => request<any[]>('/stock/godown'),
  },
  parties: {
    list: () => request<any[]>('/parties'),
    create: (data: any) => request<any>('/parties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/parties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    summary: (id: number) => request<any>(`/parties/${id}/summary`),
    ledger: (id: number) => request<any>(`/parties/${id}/ledger`),
  },
  payments: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/payments${q}`);
    },
    create: (data: any) => request<any>('/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/payments/${id}`, { method: 'DELETE' }),
    partiesWithDues: () => request<any[]>('/payments/parties-with-dues'),
  },
  expenses: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/expenses${q}`);
    },
    create: (data: any) => request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/expenses/${id}`, { method: 'DELETE' }),
  },
  reports: {
    pnl: (month?: string) => request<any>(`/reports/pnl${month ? `?month=${month}` : ''}`),
    brands: () => request<any[]>('/reports/brands'),
    outstanding: () => request<any[]>('/reports/outstanding'),
    dailyRegister: (month?: string) => request<any[]>(`/reports/daily-register${month ? `?month=${month}` : ''}`),
    dailyPnl: (month?: string) => request<any[]>(`/reports/daily-pnl${month ? `?month=${month}` : ''}`),
    dailyCollection: (month?: string, view?: 'daily' | 'monthly') => {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (view) params.set('view', view);
      const qs = params.toString();
      return request<any>(`/reports/daily-collection${qs ? `?${qs}` : ''}`);
    },
  },
  capital: {
    summary: () => request<any>('/capital/summary'),
    banks: () => request<any[]>('/capital/banks'),
    upsertBank: (data: { bank_name: string; opening_balance: number }) => request<any>('/capital/banks', { method: 'POST', body: JSON.stringify(data) }),
    deleteBank: (name: string) => request<any>(`/capital/banks/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },
  imprest: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/imprest${q}`);
    },
    handlers: () => request<any[]>('/imprest/handlers'),
    upsertHandler: (data: { handler_name: string; opening_balance: number }) => request<any>('/imprest/handlers', { method: 'POST', body: JSON.stringify(data) }),
    create: (data: any) => request<any>('/imprest', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/imprest/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/imprest/${id}`, { method: 'DELETE' }),
  },
  loans: {
    list: () => request<any[]>('/loans'),
    create: (data: any) => request<any>('/loans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/loans/${id}`, { method: 'DELETE' }),
  },
  dealers: {
    list: () => request<any[]>('/dealers'),
    create: (data: any) => request<any>('/dealers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/dealers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    subParties: (id: number) => request<any[]>(`/dealers/${id}/sub-parties`),
    addSubParty: (id: number, data: any) => request<any>(`/dealers/${id}/sub-parties`, { method: 'POST', body: JSON.stringify(data) }),
    ledger: (id: number) => request<any>(`/dealers/${id}/ledger`),
  },
  brands: {
    list: () => request<any[]>('/brands'),
    all: () => request<any[]>('/brands/all'),
    create: (data: { name: string; type: string; manufacturer: string }) =>
      request<any>('/brands', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/brands/${id}`, { method: 'DELETE' }),
  },
  godowns: {
    list: () => request<any[]>('/godowns'),
    create: (data: { name: string; location: string }) =>
      request<any>('/godowns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/godowns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/godowns/${id}`, { method: 'DELETE' }),
  },
  import: {
    parse: async (file: File, fileType: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('file_type', fileType);
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${BASE}/import/parse`, { method: 'POST', body: form, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Parse failed');
      return data;
    },
    execute: (data: any) => request<any>('/import/execute', { method: 'POST', body: JSON.stringify(data) }),
  },
};
