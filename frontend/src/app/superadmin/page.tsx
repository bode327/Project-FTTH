'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Stats {
  tenants: { total: number; active: number; blocked: number; suspended: number };
  clients: { total: number };
  ctos: { total: number };
  pops: { total: number };
  cables: { total: number; total_km: number };
}

interface Tenant {
  id: string;
  empresa: string;
  dominio: string;
  plano: string;
  status: 'active' | 'blocked' | 'suspended' | 'trial';
  pops_count: number;
  olts_count: number;
  ctos_count: number;
  ces_count: number;
  clientes_count: number;
  cabos_count: number;
  cabo_km: number;
  fibers_count: number;
  switches_count: number;
  routers_count: number;
  dios_count: number;
  usuarios_count: number;
  last_activity: string | null;
  admin_email: string;
  admin_name: string;
  blocked_reason?: string;
  billing_cycle?: string;
  next_billing_date?: string;
  features?: Record<string, boolean>;
  quotas?: Record<string, number>;
}

interface EditFormData {
  empresa: string;
  dominio: string;
  plano: string;
  status: string;
  blocked_reason: string;
  billing_cycle: string;
  next_billing_date: string;
  max_pops: number;
  max_olts: number;
  max_ctos: number;
  max_ces: number;
  max_clients: number;
  max_cables: number;
  max_fibers: number;
  features: Record<string, boolean>;
}

const PLANS = ['trial', 'free', 'basic', 'pro', 'enterprise'] as const;
const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  free: 'Gratuito',
  basic: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  blocked: 'Bloqueado',
  suspended: 'Suspenso',
  trial: 'Trial',
};

const ALL_FEATURES = [
  { key: 'mapa', label: 'Mapa' },
  { key: 'kml_import', label: 'Importar KML' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'viabilidade', label: 'Viabilidade' },
  { key: 'calculo_sinal', label: 'Cálculo de Sinal' },
  { key: 'diagrama_fusão', label: 'Diagrama de Fusão' },
  { key: 'plano_fusao', label: 'Plano de Fusão' },
  { key: 'analise_rompimento', label: 'Análise de Rompimento' },
  { key: 'projetos', label: 'Projetos' },
  { key: 'multiple_areas', label: 'Múltiplas Áreas' },
];

export default function SuperadminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [createForm, setCreateForm] = useState<{
    nome_empresa: string;
    dominio: string;
    admin_email: string;
    admin_name: string;
    password: string;
    plano: string;
    max_pops: number;
    max_olts: number;
    max_ctos: number;
    max_ces: number;
    max_clients: number;
    max_cables: number;
    max_fibers: number;
    features: Record<string, boolean>;
  }>({
    nome_empresa: '',
    dominio: '',
    admin_email: '',
    admin_name: '',
    password: '',
    plano: 'trial',
    max_pops: 5,
    max_olts: 2,
    max_ctos: 10,
    max_ces: 50,
    max_clients: 100,
    max_cables: 20,
    max_fibers: 1000,
    features: {},
  });
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [statsData, tenantsData] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/tenants'),
      ]);
      if (statsData) setStats(statsData);
      if (tenantsData) setTenants(tenantsData.data || tenantsData || []);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    if (!token || role !== 'superadmin') {
      router.push('/login');
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    loadData();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/superadmin/tenants', createForm);
      setShowCreate(false);
      setCreateForm({
        nome_empresa: '',
        dominio: '',
        admin_email: '',
        admin_name: '',
        password: '',
        plano: 'trial',
        max_pops: 5,
        max_olts: 2,
        max_ctos: 10,
        max_ces: 50,
        max_clients: 100,
        max_cables: 20,
        max_fibers: 1000,
        features: {},
      });
      loadData();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !selectedTenant) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/superadmin/tenants/${selectedTenant.id}`, editForm);
      setShowEdit(false);
      loadData();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedTenant) return;
    if (!confirm('Tem certeza que deseja resetar a senha do admin?')) return;
    try {
      await api.post(`/superadmin/tenants/${selectedTenant.id}/reset-password`);
      alert('Senha resetada com sucesso!');
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const openEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditForm({
      empresa: tenant.empresa,
      dominio: tenant.dominio,
      plano: tenant.plano,
      status: tenant.status,
      blocked_reason: tenant.blocked_reason || '',
      billing_cycle: tenant.billing_cycle || 'monthly',
      next_billing_date: tenant.next_billing_date || '',
      max_pops: tenant.quotas?.max_pops || 5,
      max_olts: tenant.quotas?.max_olts || 2,
      max_ctos: tenant.quotas?.max_ctos || 10,
      max_ces: tenant.quotas?.max_ces || 50,
      max_clients: tenant.quotas?.max_clients || 100,
      max_cables: tenant.quotas?.max_cables || 20,
      max_fibers: tenant.quotas?.max_fibers || 1000,
      features: tenant.features || {},
    });
    setShowEdit(true);
  };

  const openAnalytics = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowAnalytics(true);
  };

  const toggleFeature = (key: string, isCreate = false) => {
    if (isCreate) {
      setCreateForm(prev => ({
        ...prev,
        features: { ...prev.features, [key]: !prev.features[key] },
      }));
    } else if (editForm) {
      setEditForm(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          features: { ...prev.features, [key]: !prev.features[key] },
        };
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <aside className="w-64 bg-slate-950 text-white flex flex-col border-r border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-emerald-400">FTTH SaaS</h1>
          <p className="text-xs text-slate-400 mt-1">Superadmin Panel</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Geral</div>
          <div className="px-3 py-2 rounded-lg text-sm text-emerald-400 bg-emerald-900/30 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Tenants
          </div>
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-slate-800 transition flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Painel Superadmin</h1>
            <p className="text-sm text-slate-400 mt-1">Gerencie todos os tenants</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Tenant
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.tenants.total || 0}</div>
            <div className="text-blue-100 text-sm">Total Tenants</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.tenants.active || 0}</div>
            <div className="text-green-100 text-sm">Ativos</div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.tenants.blocked || 0}</div>
            <div className="text-red-100 text-sm">Bloqueados</div>
          </div>
          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.tenants.suspended || 0}</div>
            <div className="text-gray-100 text-sm">Suspensos</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.clients.total || 0}</div>
            <div className="text-purple-100 text-sm">Clientes</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.ctos.total || 0}</div>
            <div className="text-orange-100 text-sm">CTOs</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.cables.total_km?.toFixed(1) || 0}</div>
            <div className="text-cyan-100 text-sm">km Cabo</div>
          </div>
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats?.pops.total || 0}</div>
            <div className="text-teal-100 text-sm">POPs</div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Plano</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">POPs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">OLTs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">CTOs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">CEs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Clientes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Cabos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">km Cabo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Fibras</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Switches</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Routers</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">DIOs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Usuários</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Última Atividade</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white cursor-pointer hover:text-emerald-400"
                        onClick={() => openAnalytics(tenant)}>
                        {tenant.empresa}
                      </div>
                      <div className="text-xs text-slate-500">{tenant.dominio}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{PLAN_LABELS[tenant.plano] || tenant.plano}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[tenant.status]}`}>
                        {STATUS_LABELS[tenant.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.pops_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.olts_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.ctos_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.ces_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.clientes_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.cabos_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.cabo_km?.toFixed(2) || '0.00'}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.fibers_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.switches_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.routers_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.dios_count}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{tenant.usuarios_count}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {tenant.last_activity ? new Date(tenant.last_activity).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(tenant)}
                        className="text-emerald-400 hover:text-emerald-300 p-1" title="Editar">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-4 py-8 text-center text-slate-500">
                      Nenhum tenant encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Criar Novo Tenant</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nome da Empresa *</label>
                  <input value={createForm.nome_empresa} onChange={e => setCreateForm({...createForm, nome_empresa: e.target.value})}
                    required className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Domínio *</label>
                  <input value={createForm.dominio} onChange={e => setCreateForm({...createForm, dominio: e.target.value})}
                    required placeholder="empresa.com" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email Admin *</label>
                  <input type="email" value={createForm.admin_email} onChange={e => setCreateForm({...createForm, admin_email: e.target.value})}
                    required className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nome Admin *</label>
                  <input value={createForm.admin_name} onChange={e => setCreateForm({...createForm, admin_name: e.target.value})}
                    required className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Senha *</label>
                  <input type="password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                    required className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Plano</label>
                  <select value={createForm.plano} onChange={e => setCreateForm({...createForm, plano: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                    {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Limites e Cotas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['max_pops', 'max_olts', 'max_ctos', 'max_ces', 'max_clients', 'max_cables', 'max_fibers'].map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {field.replace('max_', '').replace('_', ' ').toUpperCase()}
                      </label>
                      <input type="number" value={createForm[field as keyof typeof createForm] as number}
                        onChange={e => setCreateForm({...createForm, [field]: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Funcionalidades</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_FEATURES.map(feat => (
                    <label key={feat.key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={createForm.features[feat.key] || false}
                        onChange={() => toggleFeature(feat.key, true)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500" />
                      <span className="text-sm text-slate-300">{feat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 transition">
                  {saving ? 'Salvando...' : 'Criar Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && editForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Editar Tenant: {selectedTenant?.empresa}</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Empresa</label>
                  <input value={editForm?.empresa || ''} onChange={e => editForm && setEditForm({...editForm, empresa: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Domínio</label>
                  <input value={editForm?.dominio || ''} onChange={e => editForm && setEditForm({...editForm, dominio: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Plano</label>
                  <select value={editForm?.plano || ''} onChange={e => editForm && setEditForm({...editForm, plano: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                    {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select value={editForm?.status || ''} onChange={e => editForm && setEditForm({...editForm, status: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                    <option value="active">Ativo</option>
                    <option value="trial">Trial</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>
                {(editForm?.status === 'blocked' || editForm?.status === 'suspended') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Motivo do Bloqueio/Suspensão</label>
                    <textarea value={editForm?.blocked_reason || ''} onChange={e => editForm && setEditForm({...editForm, blocked_reason: e.target.value})}
                      rows={2} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Ciclo de Cobrança</label>
                  <select value={editForm?.billing_cycle || ''} onChange={e => editForm && setEditForm({...editForm, billing_cycle: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Próxima Data de Cobrança</label>
                  <input type="date" value={(editForm?.next_billing_date || '').split('T')[0]}
                    onChange={e => editForm && setEditForm({...editForm, next_billing_date: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Cotas do Plano</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['max_pops', 'max_olts', 'max_ctos', 'max_ces', 'max_clients', 'max_cables', 'max_fibers'].map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {field.replace('max_', '').replace('_', ' ').toUpperCase()}
                      </label>
                      <input type="number" value={(editForm?.[field as keyof EditFormData] as number) ?? 0}
                        onChange={e => editForm && setEditForm({...editForm, [field]: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Funcionalidades</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_FEATURES.map(feat => (
                    <label key={feat.key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editForm?.features?.[feat.key] || false}
                        onChange={() => toggleFeature(feat.key, false)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500" />
                      <span className="text-sm text-slate-300">{feat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Admin do Tenant</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">Email: <span className="text-white">{selectedTenant?.admin_email}</span></p>
                    <p className="text-sm text-slate-400">Nome: <span className="text-white">{selectedTenant?.admin_name}</span></p>
                  </div>
                  <button type="button" onClick={handleResetPassword}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm">
                    Resetar Senha
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 transition">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAnalytics && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Analytics: {selectedTenant.empresa}</h2>
              <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.pops_count}</div>
                  <div className="text-sm text-slate-400">POPs</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.olts_count}</div>
                  <div className="text-sm text-slate-400">OLTs</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.ctos_count}</div>
                  <div className="text-sm text-slate-400">CTOs</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.ces_count}</div>
                  <div className="text-sm text-slate-400">CTEs</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.clientes_count}</div>
                  <div className="text-sm text-slate-400">Clientes</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.usuarios_count}</div>
                  <div className="text-sm text-slate-400">Usuários</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.cabos_count}</div>
                  <div className="text-sm text-slate-400">Cabos</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.cabo_km?.toFixed(2) || '0.00'}</div>
                  <div className="text-sm text-slate-400">km Cabo</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{selectedTenant.fibers_count}</div>
                  <div className="text-sm text-slate-400">Fibras</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">Switches</h4>
                  <div className="text-xl font-bold text-white">{selectedTenant.switches_count}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">Routers</h4>
                  <div className="text-xl font-bold text-white">{selectedTenant.routers_count}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">DIOs</h4>
                  <div className="text-xl font-bold text-white">{selectedTenant.dios_count}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">Última Atividade</h4>
                  <div className="text-xl font-bold text-white">
                    {selectedTenant.last_activity ? new Date(selectedTenant.last_activity).toLocaleDateString('pt-BR') : '-'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-400 mb-3">Cotas</h4>
                <div className="space-y-2">
                  {selectedTenant.quotas && Object.entries(selectedTenant.quotas).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-slate-400">{key.replace('max_', '').replace('_', ' ')}</span>
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-400 mb-3">Funcionalidades Ativas</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTenant.features && Object.entries(selectedTenant.features)
                    .filter(([, v]) => v)
                    .map(([k]) => (
                      <span key={k} className="px-2 py-1 bg-emerald-900/50 text-emerald-400 rounded text-xs">
                        {ALL_FEATURES.find(f => f.key === k)?.label || k}
                      </span>
                    ))}
                  {(!selectedTenant.features || Object.values(selectedTenant.features).every(v => !v)) && (
                    <span className="text-slate-500 text-sm">Nenhuma funcionalidade ativada</span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end">
              <button onClick={() => setShowAnalytics(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}