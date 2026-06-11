'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Router {
  id: string;
  name: string;
  catalog_router_id: string;
  pop_id: string;
  serial_number: string;
  management_ip: string;
  notes: string;
  status: string;
  pop_name?: string;
  catalog_router_brand?: string;
  catalog_router_model?: string;
}

interface RouterInterface {
  id: string;
  router_id: string;
  interface_name: string;
  type: string;
  ip_address: string;
  subnet_mask: string;
  vlan_id: number;
  speed: number;
  status: string;
}

interface CatalogRouter {
  id: string;
  model: string;
  brand: string;
  type: string;
  wan_ports: number;
  lan_ports: number;
}

interface Pop {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  fault: 'bg-red-100 text-red-800',
};

export default function RoutersPage() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [catalogRouters, setCatalogRouters] = useState<CatalogRouter[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Router | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interfaces, setInterfaces] = useState<Record<string, RouterInterface[]>>({});
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  const [editingInterface, setEditingInterface] = useState<RouterInterface | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    catalog_router_id: '',
    pop_id: '',
    serial_number: '',
    management_ip: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, catRes, popRes] = await Promise.all([
        api.get('/routers'),
        api.get('/catalogs/router'),
        api.get('/pops'),
      ]);
      setRouters(rRes?.data || []);
      setCatalogRouters(catRes?.data || []);
      setPops(popRes?.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (expandedId) loadInterfaces(expandedId);
  }, [expandedId]);

  const loadInterfaces = async (routerId: string) => {
    setLoadingInterfaces(true);
    try {
      const res = await api.get(`/routers/${routerId}/interfaces`);
      setInterfaces(prev => ({ ...prev, [routerId]: res?.data || [] }));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/routers/${editItem.id}`, form);
      } else {
        await api.post('/routers', form);
      }
      setShowForm(false);
      setEditItem(null);
      resetForm();
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Router) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      catalog_router_id: item.catalog_router_id || '',
      pop_id: item.pop_id || '',
      serial_number: item.serial_number || '',
      management_ip: item.management_ip || '',
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir roteador?')) return;
    try {
      await api.delete(`/routers/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setForm({ name: '', catalog_router_id: '', pop_id: '', serial_number: '', management_ip: '', notes: '' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditItem(null);
    resetForm();
  };

  const handleSaveInterface = async (iface: RouterInterface) => {
    try {
      if (iface.id) {
        await api.put(`/routers/${iface.router_id}/interfaces/${iface.id}`, iface);
      }
      setEditingInterface(null);
      if (expandedId) loadInterfaces(expandedId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCatalogDisplay = (r: Router) => {
    if (r.catalog_router_brand || r.catalog_router_model) {
      return [r.catalog_router_brand, r.catalog_router_model].filter(Boolean).join(' ');
    }
    return '-';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Routers</h1>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Router
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editItem ? 'Editar' : 'Adicionar'} Router
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="RT-BACKBONE-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo (Catálogo) *</label>
                <select
                  value={form.catalog_router_id}
                  onChange={e => setForm({ ...form, catalog_router_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione</option>
                  {catalogRouters.map(c => (
                    <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">POP *</label>
                <select
                  value={form.pop_id}
                  onChange={e => setForm({ ...form, pop_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione</option>
                  {pops.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                <input
                  value={form.serial_number}
                  onChange={e => setForm({ ...form, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP de Gestão</label>
                <input
                  value={form.management_ip}
                  onChange={e => setForm({ ...form, management_ip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="192.168.0.1"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : routers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nenhum roteador cadastrado.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Gestão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {routers.map(r => (
                <Fragment key={r.id}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                    <td className="px-6 py-4 font-medium text-gray-800">{r.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{getCatalogDisplay(r)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.serial_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.management_ip || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.pop_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || 'bg-gray-100'}`}>
                        {r.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(r)} className="text-blue-600 text-sm hover:underline mr-3">Editar</button>
                      <button onClick={() => handleDelete(r.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-expanded`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-semibold text-gray-700">Interfaces do Router</h4>
                          {loadingInterfaces ? (
                            <span className="text-sm text-gray-500">Carregando...</span>
                          ) : (
                            <span className="text-sm text-gray-500">{interfaces[r.id]?.length || 0} interfaces</span>
                          )}
                        </div>
                        {interfaces[r.id] && interfaces[r.id].length > 0 ? (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left">Nome</th>
                                <th className="px-4 py-2 text-left">Tipo</th>
                                <th className="px-4 py-2 text-left">IP</th>
                                <th className="px-4 py-2 text-left">Mask</th>
                                <th className="px-4 py-2 text-left">VLAN</th>
                                <th className="px-4 py-2 text-left">Speed</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {interfaces[r.id].map(iface => (
                                <Fragment key={iface.id}>
                                  {editingInterface?.id === iface.id ? (
                                    <>
                                      <td className="px-4 py-2">
                                        <input value={editingInterface.interface_name} onChange={e => setEditingInterface({ ...editingInterface, interface_name: e.target.value })} className="border rounded px-2 py-1 text-xs w-20" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <select value={editingInterface.type} onChange={e => setEditingInterface({ ...editingInterface, type: e.target.value })} className="border rounded px-2 py-1 text-xs">
                                          <option value="wan">wan</option>
                                          <option value="lan">lan</option>
                                          <option value="loopback">loopback</option>
                                          <option value="management">management</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-2">
                                        <input value={editingInterface.ip_address} onChange={e => setEditingInterface({ ...editingInterface, ip_address: e.target.value })} className="border rounded px-2 py-1 text-xs w-28" placeholder="192.168.1.1" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input value={editingInterface.subnet_mask} onChange={e => setEditingInterface({ ...editingInterface, subnet_mask: e.target.value })} className="border rounded px-2 py-1 text-xs w-24" placeholder="255.255.255.0" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input type="number" value={editingInterface.vlan_id} onChange={e => setEditingInterface({ ...editingInterface, vlan_id: parseInt(e.target.value) || 1 })} className="border rounded px-2 py-1 text-xs w-16" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input type="number" value={editingInterface.speed} onChange={e => setEditingInterface({ ...editingInterface, speed: parseInt(e.target.value) || 0 })} className="border rounded px-2 py-1 text-xs w-20" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <select value={editingInterface.status} onChange={e => setEditingInterface({ ...editingInterface, status: e.target.value })} className="border rounded px-2 py-1 text-xs">
                                          <option value="active">active</option>
                                          <option value="inactive">inactive</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <button onClick={() => handleSaveInterface(editingInterface)} className="text-green-600 text-xs hover:underline mr-2">Salvar</button>
                                        <button onClick={() => setEditingInterface(null)} className="text-gray-500 text-xs hover:underline">Cancelar</button>
                                      </td>
                                    </>
                                  ) : (
                                    <tr>
                                      <td className="px-4 py-2">{iface.interface_name}</td>
                                      <td className="px-4 py-2">{iface.type}</td>
                                      <td className="px-4 py-2">{iface.ip_address || '-'}</td>
                                      <td className="px-4 py-2">{iface.subnet_mask || '-'}</td>
                                      <td className="px-4 py-2">{iface.vlan_id || '-'}</td>
                                      <td className="px-4 py-2">{iface.speed ? `${iface.speed} Mbps` : '-'}</td>
                                      <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[iface.status] || 'bg-gray-100'}`}>{iface.status}</span>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <button onClick={() => setEditingInterface(iface)} className="text-blue-600 text-xs hover:underline">Editar</button>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhuma interface configurada.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}