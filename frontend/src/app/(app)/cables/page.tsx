'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function CablesPage() {
  const [cables, setCables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', node_a_id: '', node_b_id: '', calculated_distance_km: '', measured_distance_km: '' });

  const load = () => api.get(apiRoutes.cables).then(data => { if (data) setCables(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post(apiRoutes.cables, { name: form.name, node_a_id: form.node_a_id || null, node_b_id: form.node_b_id || null, calculated_distance_km: form.calculated_distance_km ? parseFloat(form.calculated_distance_km) : null, measured_distance_km: form.measured_distance_km ? parseFloat(form.measured_distance_km) : null }); setShowForm(false); setForm({ name: '', node_a_id: '', node_b_id: '', calculated_distance_km: '', measured_distance_km: '' }); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cabos</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo Cabo</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" placeholder="Cabo FO 36FO AS80" /></div>
            <div><label className="block text-sm font-medium mb-1">Distância Calculada (km)</label><input type="number" step="any" value={form.calculated_distance_km} onChange={e => setForm({...form, calculated_distance_km: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Distância Medida OTDR (km)</label><input type="number" step="any" value={form.measured_distance_km} onChange={e => setForm({...form, measured_distance_km: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : cables.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum cabo cadastrado.</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">De</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Para</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distância Calculada</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distância OTDR</th></tr></thead>
            <tbody className="divide-y">{cables.map(cable => <tr key={cable.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{cable.name}</td><td className="px-6 py-4 text-sm">{cable.node_a_name || '-'}</td><td className="px-6 py-4 text-sm">{cable.node_b_name || '-'}</td><td className="px-6 py-4 text-sm">{cable.calculated_distance_km ? `${cable.calculated_distance_km} km` : '-'}</td><td className="px-6 py-4 text-sm">{cable.measured_distance_km ? `${cable.measured_distance_km} km` : '-'}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}