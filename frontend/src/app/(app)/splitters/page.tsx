'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function SplittersPage() {
  const [splitters, setSplitters] = useState<any[]>([]);
  const [ctos, setCtos] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cto_id: '', catalog_splitter_id: '', tray_number: 1, tray_position: '', input_fiber_id: '' });

  const load = () => {
    api.get(apiRoutes.splitters).then(data => { if (data) setSplitters(data.data || []); });
    api.get(apiRoutes.ctos).then(data => { if (data) setCtos(data.data || []); });
    api.get(apiRoutes.catalogs + '/splitter').then(data => { if (data) setCatalog(data.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post(apiRoutes.splitters, { cto_id: form.cto_id || null, catalog_splitter_id: form.catalog_splitter_id, tray_number: form.tray_number, tray_position: form.tray_position ? parseInt(form.tray_position) : null, input_fiber_id: form.input_fiber_id || null }); setShowForm(false); setForm({ cto_id: '', catalog_splitter_id: '', tray_number: 1, tray_position: '', input_fiber_id: '' }); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Splitters</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo Splitter</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">CTO *</label><select value={form.cto_id} onChange={e => setForm({...form, cto_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Selecione CTO</option>{ctos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Razão *</label><select value={form.catalog_splitter_id} onChange={e => setForm({...form, catalog_splitter_id: e.target.value})} required className="w-full px-3 py-2 border rounded-lg"><option value="">Selecione razão</option>{catalog.map(c => <option key={c.id} value={c.id}>{c.ratio} ({c.insertion_loss_db}dB)</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Bandeja</label><input type="number" value={form.tray_number} onChange={e => setForm({...form, tray_number: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : splitters.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum splitter cadastrado.</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTO</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razão</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perda Inserção</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bandeja</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fibra Entrada</th></tr></thead>
            <tbody className="divide-y">{splitters.map(sp => <tr key={sp.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm">{sp.cto_name || '-'}</td><td className="px-6 py-4 font-medium">{sp.ratio || '-'}</td><td className="px-6 py-4 text-sm">{sp.insertion_loss_db ? `${sp.insertion_loss_db} dB` : '-'}</td><td className="px-6 py-4 text-sm">{sp.tray_number || 1}</td><td className="px-6 py-4 text-sm">{sp.input_fiber || '-'}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}