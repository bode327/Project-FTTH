'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function FibersPage() {
  const [fibers, setFibers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get(apiRoutes.fibers).then(data => { if (data) setFibers(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const statusColors: Record<string, string> = { free: 'bg-gray-100 text-gray-800', in_use: 'bg-green-100 text-green-800', spliced: 'bg-blue-100 text-blue-800', reserved: 'bg-yellow-100 text-yellow-800', broken: 'bg-red-100 text-red-800', maintenance: 'bg-orange-100 text-orange-800' };
  const statusLabels: Record<string, string> = { free: 'Livre', in_use: 'Em Uso', spliced: 'Emendada', reserved: 'Reservada', broken: 'Quebrada', maintenance: 'Manutenção' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fibras</h1>
        <a href="/fibers/free" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Ver Fibras Livres</a>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : fibers.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhuma fibra cadastrada.</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tubo/Fibra</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cor</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th></tr></thead>
            <tbody className="divide-y">{fibers.map(f => <tr key={f.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm">{f.cable_name || '-'}</td><td className="px-6 py-4 font-medium">{f.tube_number}/{f.fiber_number}</td><td className="px-6 py-4 text-sm"><span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: f.color || '#ccc' }}></span>{f.color || '-'}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${statusColors[f.status] || ''}`}>{statusLabels[f.status] || f.status}</span></td><td className="px-6 py-4 text-sm">{f.client_name || '-'}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}