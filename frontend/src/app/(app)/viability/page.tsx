'use client';

import { useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function ViabilityPage() {
  const [form, setForm] = useState({ lat: '', lng: '', radius_km: '5' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.get(`${apiRoutes.viability}/check?lat=${form.lat}&lng=${form.lng}&radius_km=${form.radius_km}`);
      setResult(data?.data || null);
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  const statusColors: Record<string, string> = { available: 'bg-green-100 text-green-800', limited: 'bg-yellow-100 text-yellow-800', unavailable: 'bg-red-100 text-red-800' };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Modo Viabilidade</h1>
      <p className="text-gray-500 text-sm mb-6">Informe um endereço para verificar a disponibilidade de fibras e portas próximas ao local.</p>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <form onSubmit={check} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium mb-1">Latitude *</label><input type="number" step="any" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" placeholder="-19.9321" /></div>
          <div><label className="block text-sm font-medium mb-1">Longitude *</label><input type="number" step="any" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" placeholder="-43.9345" /></div>
          <div><label className="block text-sm font-medium mb-1">Raio (km)</label><input type="number" step="any" value={form.radius_km} onChange={e => setForm({...form, radius_km: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div className="flex items-end"><button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700 transition w-full">{loading ? 'Verificando...' : 'Verificar Viabilidade'}</button></div>
        </form>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Fibras livres na região</span><span className="font-bold text-lg">{result.summary?.free_fibers || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Portas disponíveis</span><span className="font-bold text-lg">{result.summary?.available_ports || 0}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[result.summary?.viability] || ''}`}>{result.summary?.viability === 'available' ? 'Disponível' : result.summary?.viability === 'limited' ? 'Limitado' : 'Indisponível'}</span>
              </div>
            </div>
          </div>

          {result.nearby_ctos?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">CTOs Próximas</h3>
              <div className="space-y-3">
                {result.nearby_ctos.slice(0, 5).map((cto: any) => (
                  <div key={cto.id} className="border-b pb-3 last:border-0">
                    <p className="font-medium text-gray-800">{cto.name}</p>
                    <p className="text-xs text-gray-500">{cto.address || 'Sem endereço'}</p>
                    <p className="text-xs text-blue-600 mt-1">{cto.distance_m}m de distância • {cto.available_slots} portas livres</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.nearby_olts?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6 md:col-span-2">
              <h3 className="font-semibold text-gray-800 mb-4">OLTs Próximos</h3>
              <table className="w-full text-sm">
                <thead><tr><th className="text-left py-2">Nome</th><th className="text-left py-2">POP</th><th className="text-left py-2">Distância</th><th className="text-left py-2">Portas Disponíveis</th></tr></thead>
                <tbody>{result.nearby_olts.map((olt: any) => <tr key={olt.id} className="border-t"><td className="py-2 font-medium">{olt.name}</td><td className="py-2">{olt.pop_name}</td><td className="py-2">{olt.distance_m}m</td><td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${olt.available_ports > 0 ? 'bg-green-100' : 'bg-red-100'}`}>{olt.available_ports}</span></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}