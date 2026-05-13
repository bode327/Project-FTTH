'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Switch {
  id: string;
  name: string;
  catalog_switch_id: string;
  pop_id: string;
  serial_number: string;
  management_ip: string;
  vlan_default: number;
  notes: string;
  status: string;
  pop_name?: string;
  catalog_switch_model?: string;
  catalog_switch_brand?: string;
}

interface SwitchPort {
  id: string;
  switch_id: string;
  port_number: number;
  port_type: string;
  speed_mbps: number;
  duplex: string;
  vlan: number;
  lacp_group: number | null;
  poe_enabled: boolean;
  status: string;
  connected_to: string;
}

interface CatalogSwitch {
  id: string;
  model: string;
  brand: string;
  ports: number;
  type: string;
  layer: string;
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

export default function SwitchesPage() {
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [catalogSwitches, setCatalogSwitches] = useState<CatalogSwitch[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Switch | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ports, setPorts] = useState<Record<string, SwitchPort[]>>({});
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [editingPort, setEditingPort] = useState<SwitchPort | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    catalog_switch_id: '',
    pop_id: '',
    serial_number: '',
    management_ip: '',
    vlan_default: 1,
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [swRes, catRes, popRes] = await Promise.all([
        api.get('/switches'),
        api.get('/catalogs/switch'),
        api.get('/pops'),
      ]);
      setSwitches(swRes?.data || []);
      setCatalogSwitches(catRes?.data || []);
      setPops(popRes?.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (expandedId) loadPorts(expandedId);
  }, [expandedId]);

  const loadPorts = async (switchId: string) => {
    setLoadingPorts(true);
    try {
      const res = await api.get(`/switches/${switchId}/ports`);
      setPorts(prev => ({ ...prev, [switchId]: res?.data || [] }));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingPorts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.vlan_default) payload.vlan_default = parseInt(String(form.vlan_default));
      if (editItem) {
        await api.put(`/switches/${editItem.id}`, payload);
      } else {
        await api.post('/switches', payload);
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

  const handleEdit = (item: Switch) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      catalog_switch_id: item.catalog_switch_id || '',
      pop_id: item.pop_id || '',
      serial_number: item.serial_number || '',
      management_ip: item.management_ip || '',
      vlan_default: item.vlan_default || 1,
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir switch?')) return;
    try {
      await api.delete(`/switches/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setForm({ name: '', catalog_switch_id: '', pop_id: '', serial_number: '', management_ip: '', vlan_default: 1, notes: '' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditItem(null);
    resetForm();
  };

  const handleSavePort = async (port: SwitchPort) => {
    try {
      if (port.id) {
        await api.put(`/switches/${port.switch_id}/ports/${port.id}`, port);
      }
      setEditingPort(null);
      if (expandedId) loadPorts(expandedId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCatalogDisplay = (sw: Switch) => {
    if (sw.catalog_switch_brand || sw.catalog_switch_model) {
      return [sw.catalog_switch_brand, sw.catalog_switch_model].filter(Boolean).join(' ');
    }
    return '-';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Switches</h1>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Switch
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editItem ? 'Editar' : 'Adicionar'} Switch
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
                  placeholder="SW-CENTRO-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo (Catálogo) *</label>
                <select
                  value={form.catalog_switch_id}
                  onChange={e => setForm({ ...form, catalog_switch_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione</option>
                  {catalogSwitches.map(c => (
                    <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.ports} ports)</option>
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
                  placeholder="192.168.1.10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VLAN Padrão</label>
                <input
                  type="number"
                  value={form.vlan_default}
                  onChange={e => setForm({ ...form, vlan_default: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
        ) : switches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nenhum switch cadastrado.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Gestão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VLAN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {switches.map(sw => (
                <>
                  <tr key={sw.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === sw.id ? null : sw.id)}>
                    <td className="px-6 py-4 font-medium text-gray-800">{sw.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{getCatalogDisplay(sw)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sw.serial_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sw.management_ip || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sw.vlan_default || 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sw.pop_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[sw.status] || 'bg-gray-100'}`}>
                        {sw.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(sw)} className="text-blue-600 text-sm hover:underline mr-3">Editar</button>
                      <button onClick={() => handleDelete(sw.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                    </td>
                  </tr>
                  {expandedId === sw.id && (
                    <tr key={`${sw.id}-expanded`}>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-semibold text-gray-700">Portas do Switch</h4>
                          {loadingPorts ? <span className="text-sm text-gray-500">Carregando...</span> : (
                            <span className="text-sm text-gray-500">{ports[sw.id]?.length || 0} portas</span>
                          )}
                        </div>
                        {ports[sw.id] && ports[sw.id].length > 0 ? (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left">Porta</th>
                                <th className="px-4 py-2 text-left">Tipo</th>
                                <th className="px-4 py-2 text-left">Speed</th>
                                <th className="px-4 py-2 text-left">Duplex</th>
                                <th className="px-4 py-2 text-left">VLAN</th>
                                <th className="px-4 py-2 text-left">LACP</th>
                                <th className="px-4 py-2 text-left">PoE</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Conectado a</th>
                                <th className="px-4 py-2 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {ports[sw.id].map(port => (
                                <tr key={port.id}>
                                  {editingPort?.id === port.id ? (
                                    <>
                                      <td className="px-4 py-2">{port.port_number}</td>
                                      <td className="px-4 py-2">
                                        <select value={editingPort.port_type} onChange={e => setEditingPort({ ...editingPort, port_type: e.target.value })} className="border rounded px-2 py-1 text-xs">
                                          <option value="copper">copper</option>
                                          <option value="fiber">fiber</option>
                                          <option value="sfp">sfp</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-2">
                                        <input type="number" value={editingPort.speed_mbps} onChange={e => setEditingPort({ ...editingPort, speed_mbps: parseInt(e.target.value) || 0 })} className="border rounded px-2 py-1 text-xs w-20" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <select value={editingPort.duplex} onChange={e => setEditingPort({ ...editingPort, duplex: e.target.value })} className="border rounded px-2 py-1 text-xs">
                                          <option value="full">full</option>
                                          <option value="half">half</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-2">
                                        <input type="number" value={editingPort.vlan} onChange={e => setEditingPort({ ...editingPort, vlan: parseInt(e.target.value) || 1 })} className="border rounded px-2 py-1 text-xs w-16" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input type="number" value={editingPort.lacp_group || ''} onChange={e => setEditingPort({ ...editingPort, lacp_group: e.target.value ? parseInt(e.target.value) : null })} className="border rounded px-2 py-1 text-xs w-16" placeholder="-" />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input type="checkbox" checked={editingPort.poe_enabled} onChange={e => setEditingPort({ ...editingPort, poe_enabled: e.target.checked })} />
                                      </td>
                                      <td className="px-4 py-2">
                                        <select value={editingPort.status} onChange={e => setEditingPort({ ...editingPort, status: e.target.value })} className="border rounded px-2 py-1 text-xs">
                                          <option value="active">active</option>
                                          <option value="inactive">inactive</option>
                                          <option value="blocked">blocked</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-2">
                                        <input value={editingPort.connected_to || ''} onChange={e => setEditingPort({ ...editingPort, connected_to: e.target.value })} className="border rounded px-2 py-1 text-xs w-24" placeholder="-" />
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <button onClick={() => handleSavePort(editingPort)} className="text-green-600 text-xs hover:underline mr-2">Salvar</button>
                                        <button onClick={() => setEditingPort(null)} className="text-gray-500 text-xs hover:underline">Cancelar</button>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-4 py-2">{port.port_number}</td>
                                      <td className="px-4 py-2">{port.port_type}</td>
                                      <td className="px-4 py-2">{port.speed_mbps}</td>
                                      <td className="px-4 py-2">{port.duplex}</td>
                                      <td className="px-4 py-2">{port.vlan}</td>
                                      <td className="px-4 py-2">{port.lacp_group || '-'}</td>
                                      <td className="px-4 py-2">{port.poe_enabled ? 'Sim' : 'Não'}</td>
                                      <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[port.status] || 'bg-gray-100'}`}>{port.status}</span>
                                      </td>
                                      <td className="px-4 py-2">{port.connected_to || '-'}</td>
                                      <td className="px-4 py-2 text-right">
                                        <button onClick={() => setEditingPort(port)} className="text-blue-600 text-xs hover:underline">Editar</button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhuma porta configurada.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}