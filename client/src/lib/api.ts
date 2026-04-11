const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
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
  },
  sales: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/sales${q}`);
    },
    create: (data: any) => request<any>('/sales', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/sales/${id}`, { method: 'DELETE' }),
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
    dailyCollection: (month?: string) => request<any>(`/reports/daily-collection${month ? `?month=${month}` : ''}`),
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
  brands: () => request<any[]>('/brands'),
  godowns: () => request<any[]>('/godowns'),
  import: {
    parse: async (file: File, fileType: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('file_type', fileType);
      const res = await fetch(`${BASE}/import/parse`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Parse failed');
      return data;
    },
    execute: (data: any) => request<any>('/import/execute', { method: 'POST', body: JSON.stringify(data) }),
  },
};
