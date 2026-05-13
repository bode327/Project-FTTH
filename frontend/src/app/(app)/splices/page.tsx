'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function SplicesPage() {
  const [splices, setSplices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tray_id: '', splice_type: 'fusion', fiber_a_id: '', fiber_b_id: '', tray_position: '', loss_db: '' });

  const load = () => api.get(apiRoutes.splices).then(data => { if (data) setSplices(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post(apiRoutes.splices, { tray_id: form.tray_id || null, splice_type: form.splice_type, fiber_a_id: form.fiber_a_id || null, fiber_b_id: form.fiber_b_id || null, tray_position: form.tray_position ? parseInt(form.tray_position) : null, loss_db: form.loss_db ? parseFloat(form.loss_db) : null }); setShowForm(false); setForm({ tray_id: '', splice_type: 'fusion', fiber_a_id: '', fiber_b_id: '', tray_position: '', loss_db: '' }); load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fusões</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Nova Fusão</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Tipo</label><select value={form.splice_type} onChange={e => setForm({...form, splice_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="fusion">Fusão</option><option value="mechanical">Mecânica</option></select></div>
            <div><label className="block text-sm font-medium mb-1">Perda (dB)</label><input type="number" step="0.01" value={form.loss_db} onChange={e => setForm({...form, loss_db: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="0.15" /></div>
            <div><label className="block text-sm font-medium mb-1">Posição na Bandeja</label><input type="number" value={form.tray_position} onChange={e => setForm({...form, tray_position: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : splices.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhuma fusão cadastrada.</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fibra A</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fibra B</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perda (dB)</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th></tr></thead>
            <tbody className="divide-y">{splices.map(s => <tr key={s.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm"><span className={`px-2 py-0.5 rounded text-xs ${s.splice_type === 'fusion' ? 'bg-blue-100' : 'bg-orange-100'}`}>{s.splice_type === 'fusion' ? 'Fusão' : 'Mecânica'}</span></td><td className="px-6 py-4 text-sm">{s.fiber_a_pos || '-'}</td><td className="px-6 py-4 text-sm">{s.fiber_b_pos || '-'}</td><td className="px-6 py-4 text-sm">{s.cable_name || '-'}</td><td className="px-6 py-4 text-sm">{s.loss_db ? `${s.loss_db} dB` : '0.15 dB'}</td><td className="px-6 py-4 text-sm text-gray-500">{s.performed_at ? new Date(s.performed_at).toLocaleDateString('pt-BR') : '-'}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}