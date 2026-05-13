'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [ctos, setCtos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', plan_mbps: '', cto_id: '', ont_serial: '', vlan: '' });

  const load = () => {
    api.get(apiRoutes.clients).then(data => { if (data) setClients(data.data || []); });
    api.get(apiRoutes.ctos).then(data => { if (data) setCtos(data.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post(apiRoutes.clients, { name: form.name, address: form.address, phone: form.phone, plan_mbps: form.plan_mbps ? parseInt(form.plan_mbps) : null, cto_id: form.cto_id || null, ont_serial: form.ont_serial || null, vlan: form.vlan ? parseInt(form.vlan) : null }); setShowForm(false); setForm({ name: '', address: '', phone: '', plan_mbps: '', cto_id: '', ont_serial: '', vlan: '' }); load(); }
    catch (err: any) { alert(err.message); }
  };

  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800', suspended: 'bg-red-100 text-red-800' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo Cliente</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">CTO</label><select value={form.cto_id} onChange={e => setForm({...form, cto_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Selecione CTO</option>{ctos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Endereço</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Telefone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Plano (Mbps)</label><input type="number" value={form.plan_mbps} onChange={e => setForm({...form, plan_mbps: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Serial ONT</label><input value={form.ont_serial} onChange={e => setForm({...form, ont_serial: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">VLAN</label><input type="number" value={form.vlan} onChange={e => setForm({...form, vlan: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : clients.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum cliente cadastrado.</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTO</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr></thead>
            <tbody className="divide-y">{clients.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{c.name}</td><td className="px-6 py-4 text-sm">{c.cto_name || '-'}</td><td className="px-6 py-4 text-sm">{c.phone || '-'}</td><td className="px-6 py-4 text-sm">{c.plan_mbps ? `${c.plan_mbps} Mbps` : '-'}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${statusColors[c.status] || ''}`}>{c.status || 'active'}</span></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}