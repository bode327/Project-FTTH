'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Dio {
  id: string;
  name: string;
  catalog_dio_id: string;
  pop_id: string;
  rack_location: string;
  total_ports: number;
  notes: string;
  status: string;
  pop_name?: string;
  catalog_dio_model?: string;
  catalog_dio_brand?: string;
  used_ports?: number;
}

interface CatalogDio {
  id: string;
  model: string;
  brand: string;
  total_ports: number;
  type: string;
  height_units: number;
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

export default function DiosPage() {
  const [dios, setDios] = useState<Dio[]>([]);
  const [catalogDios, setCatalogDios] = useState<CatalogDio[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Dio | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    catalog_dio_id: '',
    pop_id: '',
    rack_location: '',
    total_ports: 12,
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, catRes, popRes] = await Promise.all([
        api.get('/dios'),
        api.get('/catalogs/dio'),
        api.get('/pops'),
      ]);
      setDios(dRes?.data || []);
      setCatalogDios(catRes?.data || []);
      setPops(popRes?.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.total_ports) payload.total_ports = parseInt(String(form.total_ports));
      if (editItem) {
        await api.put(`/dios/${editItem.id}`, payload);
      } else {
        await api.post('/dios', payload);
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

  const handleEdit = (item: Dio) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      catalog_dio_id: item.catalog_dio_id || '',
      pop_id: item.pop_id || '',
      rack_location: item.rack_location || '',
      total_ports: item.total_ports || 12,
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir DIO?')) return;
    try {
      await api.delete(`/dios/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setForm({ name: '', catalog_dio_id: '', pop_id: '', rack_location: '', total_ports: 12, notes: '' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditItem(null);
    resetForm();
  };

  const getCatalogDisplay = (d: Dio) => {
    if (d.catalog_dio_brand || d.catalog_dio_model) {
      return [d.catalog_dio_brand, d.catalog_dio_model].filter(Boolean).join(' ');
    }
    return '-';
  };

  const getPortUsage = (d: Dio) => {
    const used = d.used_ports || 0;
    const total = d.total_ports || 12;
    return { used, total, pct: total > 0 ? Math.round((used / total) * 100) : 0 };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">DIOs (Patch Panels)</h1>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo DIO
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editItem ? 'Editar' : 'Adicionar'} DIO
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
                  placeholder="DIO-RACK-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo (Catálogo)</label>
                <select
                  value={form.catalog_dio_id}
                  onChange={e => setForm({ ...form, catalog_dio_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione (opcional)</option>
                  {catalogDios.map(c => (
                    <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.total_ports} ports)</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Localização (Rack)</label>
                <input
                  value={form.rack_location}
                  onChange={e => setForm({ ...form, rack_location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Rack A - Posição 12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total de Portas</label>
                <input
                  type="number"
                  value={form.total_ports}
                  onChange={e => setForm({ ...form, total_ports: parseInt(e.target.value) || 12 })}
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
        ) : dios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nenhum DIO cadastrado.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localização</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Portas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilização</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dios.map(d => {
                const usage = getPortUsage(d);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{d.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{getCatalogDisplay(d)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.rack_location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.total_ports || 12}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${usage.pct > 80 ? 'bg-red-500' : usage.pct > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${usage.pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{usage.used}/{usage.total}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.pop_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[d.status] || 'bg-gray-100'}`}>
                        {d.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(d)} className="text-blue-600 text-sm hover:underline mr-3">Editar</button>
                      <button onClick={() => handleDelete(d.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}