'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function ReportsPage() {
  const [tab, setTab] = useState<'summary' | 'clients' | 'network' | 'fibers'>('summary');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'summary') api.get(apiRoutes.reports + '/summary').then(d => { if (d) setData(d.data || {}); setLoading(false); });
    else if (tab === 'clients') api.get(apiRoutes.reports + '/clients').then(d => { if (d) setData(d.data || []); setLoading(false); });
    else if (tab === 'network') api.get(apiRoutes.reports + '/network').then(d => { if (d) setData(d.data || {}); setLoading(false); });
    else api.get(apiRoutes.reports + '/fibers').then(d => { if (d) setData(d.data || []); setLoading(false); });
  }, [tab]);

  const exportToCSV = () => {
    if (!data || !Array.isArray(data)) return;
    const headers = Object.keys(data[0] || {});
    const csv = [headers.join(','), ...data.map((row: any) => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `report_${tab}.csv`; a.click();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        {(data && Array.isArray(data)) && <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar CSV
        </button>}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['summary', 'clients', 'network', 'fibers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {t === 'summary' ? 'Resumo' : t === 'clients' ? 'Clientes' : t === 'network' ? 'Rede' : 'Fibras'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : tab === 'summary' ? (
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-gray-800">{value as number}</p>
                <p className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        ) : Array.isArray(data) && data.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>{Object.keys(data[0]).map(k => <th key={k} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{k}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row: any, i: number) => <tr key={i} className="hover:bg-gray-50">
                {Object.values(row).map((v, j) => <td key={j} className="px-6 py-4 text-sm">{String(v ?? '-')}</td>)}
              </tr>)}
            </tbody>
          </table>
        ) : <div className="p-8 text-center text-gray-500">Nenhum dado disponível.</div>}
      </div>
    </div>
  );
}