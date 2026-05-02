import { useEffect, useState } from 'react';
import { Plus, Trash2, Shield, X, KeyRound, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { useToastStore } from '../lib/store';
import Modal from '../components/ui/Modal';

const ALL_PERMISSIONS = [
  { key: 'access_cementbook', label: 'CementBook Access', group: 'Book Access' },
  { key: 'access_truckbook', label: 'TruckBook Access', group: 'Book Access' },
  { key: 'access_transportbook', label: 'TransportBook Access', group: 'Book Access' },
  { key: 'view_dashboard', label: 'View Dashboard (CementBook)', group: 'Pages' },
  { key: 'view_truckbook_dashboard', label: 'View Dashboard (TruckBook)', group: 'Pages' },
  { key: 'view_transportbook_dashboard', label: 'View Dashboard (TransportBook)', group: 'Pages' },
  { key: 'view_capital', label: 'View Capital', group: 'Pages' },
  { key: 'view_finance', label: 'View Finance', group: 'Pages' },
  { key: 'delete_purchases', label: 'Delete Purchases', group: 'Delete' },
  { key: 'delete_sales', label: 'Delete Sales', group: 'Delete' },
  { key: 'delete_payments', label: 'Delete Payments', group: 'Delete' },
  { key: 'delete_expenses', label: 'Delete Expenses', group: 'Delete' },
  { key: 'delete_imprest', label: 'Delete Imprest', group: 'Delete' },
  { key: 'delete_capital_banks', label: 'Delete Bank Accounts', group: 'Delete' },
  { key: 'delete_loans', label: 'Delete Loans', group: 'Delete' },
  { key: 'manage_transport_rates', label: 'Manage Transport Rates (GPS, Bilty, Handling)', group: 'Other' },
  { key: 'update_truck_trip_freight', label: 'Update Trip Freight (TruckBook)', group: 'Other' },
  { key: 'download', label: 'Download / Export', group: 'Other' },
];

interface User {
  id: number;
  username: string;
  role: string;
  display_name: string;
  email: string | null;
  created_at: string;
  permissions: string[];
}

export default function UserManagement() {
  const addToast = useToastStore((s) => s.addToast);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [permUserId, setPermUserId] = useState<number | null>(null);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [emailEditId, setEmailEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'user', email: '' });
  const [resetPw, setResetPw] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.auth.listUsers();
      setUsers(data);
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleAddUser = async () => {
    if (!form.username || !form.password || !form.display_name) {
      addToast('Username, password, and display name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.auth.createUser(form);
      addToast('User created successfully');
      setShowAddModal(false);
      setForm({ username: '', password: '', display_name: '', role: 'user', email: '' });
      loadUsers();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.auth.deleteUser(id);
      addToast('User deleted');
      loadUsers();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleTogglePermission = async (userId: number, permKey: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const current = user.permissions || [];
    const updated = current.includes(permKey)
      ? current.filter((p) => p !== permKey)
      : [...current, permKey];
    try {
      await api.auth.updatePermissions(userId, updated);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions: updated } : u)));
      addToast('Permissions updated');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleAdminResetPassword = async () => {
    if (!resetPw || resetPw.length < 6) { addToast('Password must be at least 6 characters', 'error'); return; }
    setSaving(true);
    try {
      await api.auth.adminResetPassword(resetUserId!, resetPw);
      addToast('Password reset successfully');
      setResetUserId(null);
      setResetPw('');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSave = async () => {
    setSaving(true);
    try {
      await api.auth.updateEmail(emailEditId!, emailVal.trim());
      setUsers((prev) => prev.map((u) => (u.id === emailEditId ? { ...u, email: emailVal.trim() || null } : u)));
      addToast('Email updated');
      setEmailEditId(null);
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const permUser = users.find((u) => u.id === permUserId);
  const resetUser = users.find((u) => u.id === resetUserId);
  const emailUser = users.find((u) => u.id === emailEditId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">User Management</h1>
          <p className="mt-1 text-sm text-heading/60">Manage users, roles, emails, and permissions</p>
        </div>
        <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-heading/60">Loading users...</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="bg-surface">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-heading/60">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-heading/60">Display Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-heading/60">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-heading/60">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-heading/60">Permissions</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-heading/60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3 text-sm font-medium text-heading">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-heading/80">{u.display_name}</td>
                  <td className="px-4 py-3 text-sm text-heading/60">
                    <div className="flex items-center gap-1.5">
                      <span className={u.email ? 'text-heading/80' : 'text-heading/50 italic'}>
                        {u.email || 'No email set'}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEmailEditId(u.id); setEmailVal(u.email || ''); }}
                        className="rounded p-0.5 text-heading/50 hover:text-brand-600 hover:bg-brand-50"
                        title="Edit email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === 'admin' ? 'bg-brand-500/10 text-brand-700' : 'bg-surface text-heading/80'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-heading/60">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-heading/50">All permissions</span>
                    ) : (
                      <span className="text-xs">{(u.permissions || []).length} permission(s)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => { setResetUserId(u.id); setResetPw(''); }}
                        className="rounded p-1.5 text-heading/70 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:text-amber-300"
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => setPermUserId(u.id)}
                          className="rounded p-1.5 text-heading/70 hover:bg-card-border/50"
                          title="Manage permissions"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                      )}
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.display_name)}
                          className="rounded p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add User">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Username *</label>
            <input type="text" className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Password *</label>
            <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Display Name *</label>
            <input type="text" className="input-field" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Email</label>
            <input type="email" className="input-field" placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <p className="mt-1 text-xs text-heading/60">Required for password reset emails.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Role</label>
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleAddUser} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Email Modal */}
      {emailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-heading">Set Email — {emailUser.display_name}</h2>
              <button type="button" onClick={() => setEmailEditId(null)} className="rounded p-1 hover:bg-card-border/50"><X className="h-4 w-4" /></button>
            </div>
            <input
              type="email"
              className="input-field w-full"
              placeholder="user@example.com"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
            />
            <p className="mt-1 text-xs text-heading/60">This email is used for password reset links.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setEmailEditId(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleEmailSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-heading">Reset Password — {resetUser.display_name}</h2>
              <button type="button" onClick={() => setResetUserId(null)} className="rounded p-1 hover:bg-card-border/50"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">New Password</label>
                <input
                  type="password"
                  className="input-field w-full"
                  placeholder="Min. 6 characters"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                />
              </div>
              {resetUser.email && (
                <p className="text-xs text-heading/60">
                  A notification will be sent to <strong>{resetUser.email}</strong>.
                </p>
              )}
              {!resetUser.email && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No email set for this user — no notification will be sent.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setResetUserId(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleAdminResetPassword} disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {permUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-heading">Permissions — {permUser.display_name}</h2>
              <button type="button" onClick={() => setPermUserId(null)} className="rounded p-1 hover:bg-card-border/50"><X className="h-5 w-5" /></button>
            </div>
            {['Book Access', 'Pages', 'Delete', 'Other'].map((group) => (
              <div key={group} className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-heading/60 uppercase tracking-wide">{group}</h3>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.filter((p) => p.group === group).map((perm) => {
                    const checked = (permUser.permissions || []).includes(perm.key);
                    return (
                      <label key={perm.key} className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2.5 hover:bg-surface cursor-pointer">
                        <span className="text-sm text-heading/80">{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleTogglePermission(permUser.id, perm.key)}
                          className="h-4 w-4 rounded border-card-border text-brand-600 focus:ring-brand-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setPermUserId(null)} className="btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
