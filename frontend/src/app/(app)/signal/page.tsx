'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function SignalPage() {
  const [clientId, setClientId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.get(apiRoutes.signal + '/client/' + clientId);
      setResult(data?.data || null);
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  const checkAll = async () => {
    setLoading(true);
    try {
      const data = await api.get(apiRoutes.signal + '/full-network');
      setResult(data?.data ? { allClients: data.data } : null);
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  const statusColors: Record<string, string> = { good: 'bg-green-100 text-green-800', warning: 'bg-yellow-100 text-yellow-800', critical: 'bg-red-100 text-red-800', unknown: 'bg-gray-100 text-gray-800' };
  const statusLabels: Record<string, string> = { good: 'Bom', warning: 'Atenção', critical: 'Crítico', unknown: 'Desconhecido' };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Cálculo de Potência (dBm)</h1>
      <p className="text-gray-500 text-sm mb-6">Defina a potência de saída dos GBICs e calcule a perda total até o cliente, considerando fusões, splitters e distância.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 md:col-span-2">
          <form onSubmit={check} className="flex gap-3">
            <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="ID do cliente" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Calcular</button>
          </form>
          <button onClick={checkAll} disabled={loading} className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Calcular toda a rede</button>
        </div>
        <div className="bg-blue-50 rounded-xl p-6">
          <h4 className="font-semibold text-blue-800 mb-2">Referência de Potência</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><span className="font-bold text-green-700">Bom:</span> acima -25 dBm</p>
            <p><span className="font-bold text-yellow-600">Atenção:</span> -25 a -28 dBm</p>
            <p><span className="font-bold text-red-600">Crítico:</span> abaixo -28 dBm</p>
          </div>
          <div className="mt-3 text-xs text-blue-500">
            <p>Fusão: ~0.15 dB | Splitter 1:8: ~10.5 dB</p>
            <p>Fibra: ~0.35 dB/km | Bandeja: ~0.5 dB</p>
          </div>
        </div>
      </div>

      {result ? (
        <div>
          {result.allClients ? (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Resultados da Rede</h3>
                <span className="text-sm text-gray-500">{result.allClients.length} clientes</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Potência TX</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perda Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Potência RX</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.allClients.map((c: any) => (
                    <tr key={c.client_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{c.client_name}</td>
                      <td className="px-6 py-4">{c.power_tx != null ? c.power_tx + ' dBm' : '-'}</td>
                      <td className="px-6 py-4">{c.total_loss != null ? c.total_loss + ' dB' : '-'}</td>
                      <td className="px-6 py-4 text-lg font-bold">{c.power_rx != null ? c.power_rx + ' dBm' : '-'}</td>
                      <td className="px-6 py-4">
                        <span className={"px-2 py-1 rounded-full text-xs " + (statusColors[c.status] || '')}>{statusLabels[c.status] || c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">{result.client_name}</h3>
                  <span className={"px-3 py-1 rounded-full text-sm font-medium " + (statusColors[result.status] || '')}>{statusLabels[result.status] || result.status}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600 text-sm">Potência TX (OLT)</span><span className="font-bold">{result.olt_power_tx_dbm} dBm</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 text-sm">Perda Total</span><span className="font-bold text-red-600">{result.total_loss_db} dB</span></div>
                  <div className="flex justify-between text-lg border-t pt-3">
                    <span className="text-gray-600">Potência RX Estimada</span>
                    <span className={"font-bold " + (result.status === 'good' ? 'text-green-600' : result.status === 'warning' ? 'text-yellow-600' : 'text-red-600')}>{result.estimated_power_rx_dbm} dBm</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Caminho da Rota</h4>
                <div className="space-y-2">
                  {result.path?.map((p: any, i: number) => {
                    const color = p.type === 'olt_output' ? 'bg-purple-500' : p.type === 'splitter' ? 'bg-blue-500' : p.type === 'fiber' ? 'bg-green-500' : 'bg-yellow-500';
                    const label = p.type === 'olt_output' ? 'Saída OLT' : p.type === 'splitter' ? 'Splitter ' + (p.ratio || '') : p.type === 'fiber' ? 'Fibra ' + (p.distance_km ? '(' + p.distance_km + 'km)' : '') : 'Fusão ' + (p.splice_type || '');
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className={"w-2 h-2 rounded-full " + color}></div>
                        <span className="text-gray-600">{label}</span>
                        {p.loss != null && <span className="text-red-500 ml-auto">{p.loss} dB</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Limiares: Bom acima -25 | Atenção -25 a -28 | Crítico abaixo -28 dBm</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}