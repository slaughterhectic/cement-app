import { useEffect, useState } from 'react';
import { Database, Download, HardDrive, Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../lib/api';
import { useToastStore } from '../lib/store';
import { Modal } from '../components/ui/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Brand {
  id: number;
  name: string;
  type: 'OPC' | 'PPC' | 'DAMAGE' | 'OTHER';
  manufacturer: string | null;
  is_active: number;
  stock: number;
}

interface Godown {
  id: number;
  name: string;
  location: string | null;
}

type Tab = 'brands' | 'godowns' | 'backup';

const BRAND_TYPES = ['OPC', 'PPC', 'DAMAGE', 'OTHER'] as const;

// ─── Brands Panel ─────────────────────────────────────────────────────────────

function BrandsPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', type: 'OPC' as Brand['type'], manufacturer: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.brands.all();
      setBrands(data);
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', type: 'OPC', manufacturer: '' });
    setModalOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ name: b.name, type: b.type, manufacturer: b.manufacturer || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { addToast('Brand name is required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.brands.update(editing.id, { ...form, is_active: editing.is_active });
        addToast('Brand updated');
      } else {
        await api.brands.create(form);
        addToast('Brand added');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (b: Brand) => {
    try {
      await api.brands.update(b.id, { name: b.name, type: b.type, manufacturer: b.manufacturer, is_active: b.is_active === 1 ? 0 : 1 });
      addToast(b.is_active === 1 ? 'Brand deactivated' : 'Brand activated');
      load();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = async (b: Brand) => {
    if (!window.confirm(`Delete brand "${b.name}"? This cannot be undone.`)) return;
    try {
      await api.brands.delete(b.id);
      addToast('Brand deleted');
      load();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const typeBadge: Record<Brand['type'], string> = {
    OPC: 'bg-blue-100 text-blue-700',
    PPC: 'bg-green-100 text-green-700',
    DAMAGE: 'bg-red-100 text-red-700',
    OTHER: 'bg-gray-100 text-gray-700',
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{brands.filter(b => b.is_active).length} active brands</p>
        <button type="button" onClick={openAdd} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" /> Add Brand
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : brands.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No brands yet. Add one to get started.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Manufacturer</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Stock (bags)</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((b) => (
                <tr key={b.id} className={`hover:bg-gray-50/50 ${b.is_active === 0 ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge[b.type]}`}>
                      {b.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.manufacturer || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{b.stock ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => openEdit(b)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleToggle(b)} className={`rounded p-1.5 hover:bg-gray-100 ${b.is_active ? 'text-green-600' : 'text-gray-400'}`} title={b.is_active ? 'Deactivate' : 'Activate'}>
                        {b.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => handleDelete(b)} className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Brand' : 'Add Brand'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Brand Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. UltraTech OPC 53" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Type *</label>
            <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Brand['type'] })}>
              {BRAND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Manufacturer</label>
            <input className="input-field" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. UltraTech Cement Ltd." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Brand'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Godowns Panel ────────────────────────────────────────────────────────────

function GodownsPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Godown | null>(null);
  const [form, setForm] = useState({ name: '', location: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.godowns.list();
      setGodowns(data);
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', location: '' });
    setModalOpen(true);
  };

  const openEdit = (g: Godown) => {
    setEditing(g);
    setForm({ name: g.name, location: g.location || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { addToast('Godown name is required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.godowns.update(editing.id, form);
        addToast('Godown updated');
      } else {
        await api.godowns.create(form);
        addToast('Godown added');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: Godown) => {
    if (!window.confirm(`Delete godown "${g.name}"?`)) return;
    try {
      await api.godowns.delete(g.id);
      addToast('Godown deleted');
      load();
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{godowns.length} godown{godowns.length !== 1 ? 's' : ''}</p>
        <button type="button" onClick={openAdd} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" /> Add Godown
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : godowns.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No godowns yet. Add one to get started.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Location</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {godowns.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{g.name}</td>
                  <td className="px-4 py-3 text-gray-600">{g.location || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => openEdit(g)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(g)} className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Godown' : 'Add Godown'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Godown Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Plant, City Godown" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Location</label>
            <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main Road, Sector 5" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Godown'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Backup Panel ────────────────────────────────────────────────────────────

function BackupPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [downloading, setDownloading] = useState(false);

  const handleBackup = async () => {
    setDownloading(true);
    try {
      await api.backup.download();
      addToast('Backup downloaded successfully');
    } catch (e: any) {
      addToast(e.message || 'Backup failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-heading">Download Backup</h2>
            <p className="mt-1 text-sm text-gray-500">
              Download a complete backup of all your data as a JSON file. This includes parties, purchases, sales, payments,
              expenses, stock, bank balances, loans, and user data. Save this file to Google Drive or any safe location.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleBackup}
                disabled={downloading}
                className="btn-primary disabled:opacity-50"
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading ? 'Downloading...' : 'Download Backup'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
            <HardDrive className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-heading">Automatic Backups</h2>
            <p className="mt-1 text-sm text-gray-500">
              Supabase maintains daily automatic backups (retained for 7 days). Additionally, a weekly backup runs
              via GitHub Actions every Sunday and is stored as a release artifact in your GitHub repository.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Tip: Download a manual backup before making large data changes like bulk imports or deletions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  brands: 'Cement Brands',
  godowns: 'Godowns',
  backup: 'Backup',
};

export default function Settings() {
  const [tab, setTab] = useState<Tab>('brands');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage cement brands, godowns, and data backups</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {(['brands', 'godowns', 'backup'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-heading shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-heading'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'brands' && <BrandsPanel />}
      {tab === 'godowns' && <GodownsPanel />}
      {tab === 'backup' && <BackupPanel />}
    </div>
  );
}
