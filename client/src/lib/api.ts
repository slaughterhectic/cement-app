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
    createUser: (data: { username: string; password: string; display_name: string; role: string; email?: string }) =>
      request<any>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
    deleteUser: (id: number) => request<any>(`/auth/users/${id}`, { method: 'DELETE' }),
    updatePermissions: (id: number, permissions: string[]) =>
      request<any>(`/auth/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
    updateEmail: (id: number, email: string) =>
      request<any>(`/auth/users/${id}/email`, { method: 'PUT', body: JSON.stringify({ email }) }),
    adminResetPassword: (id: number, new_password: string) =>
      request<any>(`/auth/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password }) }),
    forgotPassword: (email: string) =>
      request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, new_password: string) =>
      request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
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
    outstandingBreakdown: (type: 'receivable' | 'payable') => request<any>(`/dashboard/outstanding-breakdown?type=${type}`),
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
    godownProfit: () => request<any[]>('/stock/godown-profit'),
    openingList: () => request<any[]>('/stock/opening'),
    openingUpsert: (data: { godown_id: number; brand_id: number; bags: number; rate: number; as_of_date?: string | null; remarks?: string | null }) =>
      request<any>('/stock/opening', { method: 'POST', body: JSON.stringify(data) }),
    openingDelete: (id: number) => request<any>(`/stock/opening/${id}`, { method: 'DELETE' }),
  },
  parties: {
    list: () => request<any[]>('/parties'),
    create: (data: any) => request<any>('/parties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/parties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/parties/${id}`, { method: 'DELETE' }),
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
  expenseCategories: {
    list: () => request<{ id: number; name: string; sort_order: number }[]>('/expense-categories'),
    create: (name: string) => request<any>('/expense-categories', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: number) => request<any>(`/expense-categories/${id}`, { method: 'DELETE' }),
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
    bankTransactions: (name: string) => request<{ date: string; particulars: string; counterparty: string | null; source: string; source_id: number; inflow: number; outflow: number }[]>(`/capital/banks/${encodeURIComponent(name)}/transactions`),
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
  loanRepayments: {
    list: (loanId?: number) => request<any[]>(loanId ? `/loan-repayments?loan_id=${loanId}` : '/loan-repayments'),
    summary: () => request<{ loan_id: number; count: number; total_repaid: number }[]>('/loan-repayments/summary'),
    create: (data: any) => request<any>('/loan-repayments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/loan-repayments/${id}`, { method: 'DELETE' }),
  },
  bankTransfers: {
    list: () => request<{ id: number; date: string; from_bank: string; to_bank: string; amount: number; remarks: string | null }[]>('/bank-transfers'),
    create: (data: { date: string; from_bank: string; to_bank: string; amount: number; remarks?: string | null }) => request<any>('/bank-transfers', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/bank-transfers/${id}`, { method: 'DELETE' }),
  },
  assets: {
    list: () => request<{ id: number; date: string; name: string; type: string | null; amount: number; mode: 'bank' | 'cash'; bank_name: string | null; cash_handler: string | null; remarks: string | null }[]>('/assets'),
    create: (data: { date: string; name: string; type?: string | null; amount: number; mode: 'bank' | 'cash'; bank_name?: string | null; cash_handler?: string | null; remarks?: string | null }) => request<any>('/assets', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/assets/${id}`, { method: 'DELETE' }),
  },
  dealers: {
    list: () => request<any[]>('/dealers'),
    create: (data: any) => request<any>('/dealers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/dealers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/dealers/${id}`, { method: 'DELETE' }),
    subParties: (id: number) => request<any[]>(`/dealers/${id}/sub-parties`),
    addSubParty: (id: number, data: any) => request<any>(`/dealers/${id}/sub-parties`, { method: 'POST', body: JSON.stringify(data) }),
    deleteSubParty: (dealerId: number, subId: number) => request<any>(`/dealers/${dealerId}/sub-parties/${subId}`, { method: 'DELETE' }),
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
  partyLoans: {
    list: () => request<any[]>('/party-loans'),
    create: (data: any) => request<any>('/party-loans', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/party-loans/${id}`, { method: 'DELETE' }),
  },
  trucks: {
    list: () => request<any[]>('/trucks'),
    dashboard: () => request<any>('/trucks/dashboard'),
    create: (data: any) => request<any>('/trucks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/trucks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/trucks/${id}`, { method: 'DELETE' }),
  },
  drivers: {
    list: () => request<any[]>('/drivers'),
    create: (data: any) => request<any>('/drivers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/drivers/${id}`, { method: 'DELETE' }),
    ledger: (id: number) => request<any>(`/drivers/${id}/ledger`),
  },
  transporters: {
    list: () => request<any[]>('/transporters'),
    create: (data: { name: string; phone?: string }) =>
      request<any>('/transporters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/transporters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/transporters/${id}`, { method: 'DELETE' }),
    ledger: (id: number) => request<any>(`/transporters/${id}/ledger`),
    addPayment: (id: number, data: any) =>
      request<any>(`/transporters/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    deletePayment: (id: number, pid: number) =>
      request<any>(`/transporters/${id}/payments/${pid}`, { method: 'DELETE' }),
  },
  truckTrips: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/truck-trips${q}`);
    },
    create: (data: any) => request<any>('/truck-trips', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/truck-trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/truck-trips/${id}`, { method: 'DELETE' }),
  },
  driverPayments: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/driver-payments${q}`);
    },
    create: (data: any) => request<any>('/driver-payments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/driver-payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/driver-payments/${id}`, { method: 'DELETE' }),
  },
  truckExpenses: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/truck-expenses${q}`);
    },
    create: (data: any) => request<any>('/truck-expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/truck-expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/truck-expenses/${id}`, { method: 'DELETE' }),
  },
  requests: {
    list: (source?: string) => request<any[]>(`/requests${source ? `?source=${source}` : ''}`),
    create: (data: { title: string; message?: string; source?: string }) =>
      request<any>('/requests', { method: 'POST', body: JSON.stringify(data) }),
    complete: (id: number, admin_note?: string) =>
      request<any>(`/requests/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ admin_note }) }),
    reopen: (id: number) =>
      request<any>(`/requests/${id}/reopen`, { method: 'PATCH', body: JSON.stringify({}) }),
    delete: (id: number) => request<any>(`/requests/${id}`, { method: 'DELETE' }),
  },
  pendingEntries: {
    list: (source?: string) => request<any[]>(`/pending-entries${source ? `?source=${source}` : ''}`),
    count: (source?: string) => request<{ count: number }>(`/pending-entries/count${source ? `?source=${source}` : ''}`),
    approve: (id: number, admin_note?: string) =>
      request<any>(`/pending-entries/${id}/approve`, { method: 'POST', body: JSON.stringify({ admin_note }) }),
    reject: (id: number, admin_note?: string) =>
      request<any>(`/pending-entries/${id}/reject`, { method: 'POST', body: JSON.stringify({ admin_note }) }),
    delete: (id: number) => request<any>(`/pending-entries/${id}`, { method: 'DELETE' }),
  },
  rlTruckOwners: {
    list: () => request<any[]>('/rl/truck-owners'),
    create: (data: any) => request<any>('/rl/truck-owners', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/rl/truck-owners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/rl/truck-owners/${id}`, { method: 'DELETE' }),
    ledger: (id: number) => request<any>(`/rl/truck-owners/${id}/ledger`),
  },
  rlOwners: {
    list: () => request<any[]>('/rl/owners'),
    ledger: (name: string) => request<any>(`/rl/owners/by-name/${encodeURIComponent(name)}/ledger`),
  },
  rlOwnerAdvances: {
    list: (ownerName: string) =>
      request<{ id: number; date: string; amount: number; remarks: string | null }[]>(
        `/rl/owner-advances?owner_name=${encodeURIComponent(ownerName)}`
      ),
    create: (data: { owner_name: string; date: string; amount: number; remarks?: string }) =>
      request<any>('/rl/owner-advances', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/rl/owner-advances/${id}`, { method: 'DELETE' }),
  },
  rlTrips: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/rl/trips${q}`);
    },
    create: (data: any) => request<any>('/rl/trips', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/rl/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/rl/trips/${id}`, { method: 'DELETE' }),
    ewayAlerts: () => request<{ atRisk: any[]; counts: { expired: number; risk: number; warning: number; ok: number } }>('/rl/trips/eway-alerts'),
  },
  rlInvoices: {
    list: () => request<any[]>('/rl/invoices'),
    create: (data: any) => request<any>('/rl/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/rl/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/rl/invoices/${id}`, { method: 'DELETE' }),
    complianceSummary: (period?: string) =>
      request<{ total: number; gstr1_filed: number; gstr1_mismatch: number; gstr3b_filed: number; gstr3b_mismatch: number; itc_claimed: number; itc_reconciled: number; itc_disputed: number }>(
        `/rl/invoices/compliance-summary${period ? `?period=${encodeURIComponent(period)}` : ''}`
      ),
    patchCompliance: (id: number, data: any) =>
      request<any>(`/rl/invoices/${id}/compliance`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  rlPartners: {
    list: () => request<any[]>('/rl/partners'),
    create: (data: any) => request<any>('/rl/partners', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/rl/partners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/rl/partners/${id}`, { method: 'DELETE' }),
    transactions: (id: number) => request<any[]>(`/rl/partners/${id}/transactions`),
    addTransaction: (id: number, data: any) => request<any>(`/rl/partners/${id}/transactions`, { method: 'POST', body: JSON.stringify(data) }),
    deleteTransaction: (id: number, txId: number) => request<any>(`/rl/partners/${id}/transactions/${txId}`, { method: 'DELETE' }),
  },
  settings: {
    list: () => request<Record<string, string>>('/settings'),
    update: (key: string, value: number | string) =>
      request<{ key: string; value: string }>(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
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
