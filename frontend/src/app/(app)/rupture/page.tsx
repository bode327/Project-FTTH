'use client';

import { useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function RupturePage() {
  const [fiberId, setFiberId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [otdrDist, setOtdrDist] = useState('');
  const [otdrLoss, setOtdrLoss] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.get(`${apiRoutes.rupture}/fiber/${fiberId}`);
      setResult(data?.data || null);
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  const analyzeOTDR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fiberId) return;
    setLoading(true);
    try {
      const data = await api.post(`${apiRoutes.rupture}/fiber/${fiberId}/otdr`, { distance_m: parseFloat(otdrDist), estimated_loss_db: otdrLoss ? parseFloat(otdrLoss) : undefined });
      setResult(data?.data || null);
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Análise de Rompimento</h1>
      <p className="text-gray-500 text-sm mb-6">Analise toda a rota de uma fibra e identifique os clientes afetados por um possível rompimento.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Buscar por Fibra</h3>
          <form onSubmit={analyze} className="flex gap-3">
            <input value={fiberId} onChange={e => setFiberId(e.target.value)} placeholder="ID da fibra" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Analisar</button>
          </form>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Análise com OTDR</h3>
          <form onSubmit={analyzeOTDR} className="flex gap-3">
            <input value={otdrDist} onChange={e => setOtdrDist(e.target.value)} placeholder="Distância (m)" type="number" className="w-28 px-3 py-2 border rounded-lg text-sm" />
            <input value={otdrLoss} onChange={e => setOtdrLoss(e.target.value)} placeholder="Perda (dB)" type="number" step="0.1" className="w-24 px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" disabled={loading || !fiberId} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Calcular Rompimento</button>
          </form>
          <p className="text-xs text-gray-400 mt-2">Informe a distância medida pelo OTDR para estimar o ponto de rompimento.</p>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Informação da Fibra</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Tubo/Fibra</span><span className="font-bold">{result.tube_number}/{result.fiber_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Status</span><span className="font-medium">{result.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total de Fusões</span><span className="font-bold">{result.total_splices}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Clientes Afetados</span><span className="font-bold text-red-600">{result.affected_clients?.length || 0}</span></div>
            </div>

            {result.affected_clients?.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Clientes Afetados</h4>
                {result.affected_clients.map((c: any) => <div key={c.id} className="py-2 border-b last:border-0"><p className="font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.address || c.cto_name}</p></div>)}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Pontos de Fusão</h3>
            {result.splice_points?.length > 0 ? (
              <div className="space-y-2">
                {result.splice_points.map((sp: any, i: number) => (
                  <div key={sp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">{i + 1}</div>
                    <div className="flex-1 text-sm"><p className="font-medium">{sp.fiber_pos || 'N/A'}</p><p className="text-xs text-gray-500">{sp.splice_type}</p></div>
                    <div className="text-right text-sm"><p className="text-gray-600">{sp.position_km} km</p><p className="text-xs text-red-500">{sp.loss_db ? `${sp.loss_db}dB` : ''}</p></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">Nenhuma fusão encontrada nesta fibra.</p>}

            {result.suggested_repair_points?.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-yellow-700 mb-2">Pontos Sugeridos para Reparo</h4>
                {result.suggested_repair_points.map((sp: any) => <p key={sp.id} className="text-sm text-yellow-700">{sp.fiber_pos} — {sp.position_km}km</p>)}
              </div>
            )}

            {result.break_position_percent != null && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2">Resultado OTDR</h4>
                <p className="text-sm">Ponto de rompimento estimado: <span className="font-bold text-red-600">{result.break_position_percent}%</span> da distância total ({result.cable_total_m}m)</p>
                <p className="text-sm mt-1">A {result.estimated_break_from_olt_m}m do OLT</p>
                {result.repair_recommendation && <p className="mt-2 p-3 bg-yellow-50 rounded text-sm">{result.repair_recommendation}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}