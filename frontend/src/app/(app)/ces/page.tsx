'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function CesPage() {
  const [ces, setCes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', capacity: 12 });

  const load = () => api.get(apiRoutes.ces).then(data => { if (data) setCes(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post(apiRoutes.ces, { name: form.name, address: form.address, lat: form.lat ? parseFloat(form.lat) : undefined, lng: form.lng ? parseFloat(form.lng) : undefined, capacity: form.capacity }); setShowForm(false); setForm({ name: '', address: '', lat: '', lng: '', capacity: 12 }); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">CEs (Caixas de Emenda)</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo CE</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Endereço</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Capacidade</label><input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Latitude</label><input type="number" step="any" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Longitude</label><input type="number" step="any" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : ces.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum CE cadastrado.</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endereço</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacidade</th></tr></thead>
            <tbody className="divide-y">{ces.map(ce => <tr key={ce.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{ce.name}</td><td className="px-6 py-4 text-sm text-gray-600">{ce.address || '-'}</td><td className="px-6 py-4 text-sm">{ce.capacity}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}