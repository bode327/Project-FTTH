'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';
import HelpIcon from '@/components/HelpIcon';

export default function PopsPage() {
  const [pops, setPops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '' });

  const load = () => {
    api.get(apiRoutes.pops).then(data => { if (data) setPops(data.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(apiRoutes.pops, { name: form.name, address: form.address, lat: form.lat ? parseFloat(form.lat) : undefined, lng: form.lng ? parseFloat(form.lng) : undefined });
      setShowForm(false);
      setForm({ name: '', address: '', lat: '', lng: '' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir POP?')) return;
    await api.delete(`${apiRoutes.pops}/${id}`);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">POPs / Headends</h1>
          <HelpIcon title="POPs (Headends)" description="POP (Point of Presence) é o ponto central da sua rede óptica. Cada POP pode abrigar múltiplos OLTs e equipamentos." />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Novo POP
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Cadastrar POP</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="POP Centro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input type="number" step="any" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : pops.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">Nenhum POP cadastrado.</p>
            <p className="text-sm text-gray-400">Clique em "Novo POP" para começar.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endereço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordenadas</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pops.map(pop => (
                <tr key={pop.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{pop.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{pop.address || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {pop.lat && pop.lng ? `${parseFloat(pop.lat).toFixed(6)}, ${parseFloat(pop.lng).toFixed(6)}` : '-'}
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <a href={`/olts?pop=${pop.id}`} className="text-blue-600 text-sm hover:underline">OLTs</a>
                    <button onClick={() => handleDelete(pop.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}