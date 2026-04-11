import { useEffect, useState } from 'react';
import { Plus, Trash2, Shield, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToastStore } from '../lib/store';
import Modal from '../components/ui/Modal';

const ALL_PERMISSIONS = [
  { key: 'view_dashboard', label: 'View Dashboard', group: 'Pages' },
  { key: 'view_capital', label: 'View Capital', group: 'Pages' },
  { key: 'view_finance', label: 'View Finance', group: 'Pages' },
  { key: 'delete_purchases', label: 'Delete Purchases', group: 'Delete' },
  { key: 'delete_sales', label: 'Delete Sales', group: 'Delete' },
  { key: 'delete_payments', label: 'Delete Payments', group: 'Delete' },
  { key: 'delete_expenses', label: 'Delete Expenses', group: 'Delete' },
  { key: 'delete_imprest', label: 'Delete Imprest', group: 'Delete' },
  { key: 'delete_capital_banks', label: 'Delete Bank Accounts', group: 'Delete' },
  { key: 'delete_loans', label: 'Delete Loans', group: 'Delete' },
  { key: 'download', label: 'Download / Export', group: 'Other' },
];

interface User {
  id: number;
  username: string;
  role: string;
  display_name: string;
  created_at: string;
  permissions: string[];
}

export default function UserManagement() {
  const addToast = useToastStore((s) => s.addToast);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [permUserId, setPermUserId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'user' });
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
      addToast('All fields are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.auth.createUser(form);
      addToast('User created successfully');
      setShowAddModal(false);
      setForm({ username: '', password: '', display_name: '', role: 'user' });
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
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, permissions: updated } : u))
      );
      addToast('Permissions updated');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const permUser = users.find((u) => u.id === permUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage users, roles, and permissions</p>
        </div>
        <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading users...</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Display Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Permissions</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{u.display_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-brand-500/10 text-brand-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-gray-400">All permissions</span>
                    ) : (
                      <span className="text-xs">{(u.permissions || []).length} permission(s)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => setPermUserId(u.id)}
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                          title="Manage permissions"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                      )}
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.display_name)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
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
            <label className="mb-1 block text-sm font-medium text-heading">Username</label>
            <input
              type="text"
              className="input-field"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Password</label>
            <input
              type="password"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Display Name</label>
            <input
              type="text"
              className="input-field"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Role</label>
            <select
              className="input-field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleAddUser} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      {permUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-heading">
                Permissions for {permUser.display_name}
              </h2>
              <button type="button" onClick={() => setPermUserId(null)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {['Pages', 'Delete', 'Other'].map((group) => (
              <div key={group} className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">{group}</h3>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.filter((p) => p.group === group).map((perm) => {
                    const checked = (permUser.permissions || []).includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <span className="text-sm text-gray-700">{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleTogglePermission(permUser.id, perm.key)}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setPermUserId(null)} className="btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
