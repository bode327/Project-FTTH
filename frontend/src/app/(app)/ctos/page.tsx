'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';
import HelpIcon from '@/components/HelpIcon';

export default function CtoPage() {
  const [ctos, setCtos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', capacity: 8 });
  const [selectedCto, setSelectedCto] = useState<any>(null);
  const [ctoDetail, setCtoDetail] = useState<any>(null);

  const load = () => {
    api.get(apiRoutes.ctos).then(data => { if (data) setCtos(data.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(apiRoutes.ctos, { name: form.name, address: form.address, lat: form.lat ? parseFloat(form.lat) : undefined, lng: form.lng ? parseFloat(form.lng) : undefined, capacity: form.capacity });
      setShowForm(false);
      setForm({ name: '', address: '', lat: '', lng: '', capacity: 8 });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const viewDetail = async (ctoId: string) => {
    const data = await api.get(`${apiRoutes.fusionDiagram}/cto/${ctoId}`);
    if (data) { setCtoDetail(data.data); setSelectedCto(ctoId); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">CTOs (Caixas Terminais)</h1>
          <HelpIcon title="CTO - Caixa Terminal Óptica" description="CTO é a caixa onde splitters são instalados e clientes são conectados. Cada CTO tem capacidade limitada de portas/splitters." />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ Nova CTO</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">Cadastrar CTO</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Endereço</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Capacidade (portas)</label><input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Latitude</label><input type="number" step="any" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Longitude</label><input type="number" step="any" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {selectedCto && ctoDetail && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Diagrama: {ctoDetail.cto?.name}</h3>
            <button onClick={() => { setSelectedCto(null); setCtoDetail(null); }} className="text-gray-500">✕ Fechar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-blue-800">{ctoDetail.summary?.active_clients || 0}</p><p className="text-sm text-blue-600">Clientes Ativos</p></div>
            <div className="bg-green-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-green-800">{ctoDetail.summary?.installed_splitters || 0}</p><p className="text-sm text-green-600">Splitters</p></div>
            <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-gray-800">{ctoDetail.summary?.available_ports || 0}</p><p className="text-sm text-gray-600">Portas Disponíveis</p></div>
          </div>

          {ctoDetail.trays?.map((tray: any) => (
            <div key={tray.tray_id} className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Bandeja {tray.tray_number} ({tray.splices.length} fusões)</h4>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
                {tray.splices.map((s: any, i: number) => (
                  <div key={i} className={`p-2 rounded text-center text-xs border ${s.type === 'empty' ? 'bg-gray-100 border-gray-200' : 'bg-indigo-50 border-indigo-200'}`}>
                    <div className="font-bold text-gray-600">{s.position}</div>
                    {s.type !== 'empty' ? (
                      <>
                        <div className="text-gray-500 truncate">{s.fiber_a}</div>
                        <div className="text-gray-500 truncate">{s.fiber_b}</div>
                      </>
                    ) : <div className="text-gray-300">vazio</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {ctoDetail.clients?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Clientes Conectados</h4>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500"><th className="py-1">Nome</th><th className="py-1">Fibra</th><th className="py-1">Plano</th><th className="py-1">Status</th></tr></thead>
                <tbody className="divide-y">
                  {ctoDetail.clients.map((c: any) => (
                    <tr key={c.id}><td className="py-1">{c.name}</td><td className="py-1 text-gray-500">{c.fiber_label || '-'}</td><td className="py-1">{c.plan_mbps ? `${c.plan_mbps} Mbps` : '-'}</td><td className="py-1"><span className={`px-2 py-0.5 rounded text-xs ${c.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>{c.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : ctos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma CTO cadastrada.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endereço</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacidade</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr></thead>
            <tbody className="divide-y">
              {ctos.map(cto => (
                <tr key={cto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{cto.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cto.address || '-'}</td>
                  <td className="px-6 py-4 text-sm">{cto.capacity}</td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button onClick={() => viewDetail(cto.id)} className="text-blue-600 text-sm hover:underline">Diagrama</button>
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