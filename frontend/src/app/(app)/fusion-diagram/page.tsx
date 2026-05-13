'use client';

import { useState, useEffect } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function FusionDiagramPage() {
  const [ctos, setCtos] = useState<any[]>([]);
  const [selectedCto, setSelectedCto] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'table'>('visual');

  useEffect(() => {
    api.get(apiRoutes.ctos).then(data => { if (data) setCtos(data.data || []); setLoading(false); });
  }, []);

  const viewDiagram = async (ctoId: string) => {
    setSelectedCto(ctoId);
    const data = await api.get(`${apiRoutes.fusionDiagram}/cto/${ctoId}`);
    if (data) setDetail(data.data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Diagrama de Fusão</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">Selecionar CTO</h3>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {loading ? <div className="p-4 text-center text-gray-500">Carregando...</div> : ctos.length === 0 ? <div className="p-4 text-center text-gray-500">Nenhuma CTO</div> : ctos.map(cto => (
              <button key={cto.id} onClick={() => viewDiagram(cto.id)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selectedCto === cto.id ? 'bg-blue-50' : ''}`}>
                <p className="font-medium text-gray-800">{cto.name}</p>
                <p className="text-xs text-gray-500">{cto.address || 'Sem endereço'}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {detail ? (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Diagrama: {detail.cto?.name}</h3>
                  <p className="text-xs text-gray-500">{detail.cto?.address}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('visual')} className={`px-3 py-1 rounded text-xs ${activeTab === 'visual' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Visual</button>
                  <button onClick={() => setActiveTab('table')} className={`px-3 py-1 rounded text-xs ${activeTab === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Tabela</button>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-green-800">{detail.summary?.active_clients || 0}</p><p className="text-xs text-green-600">Clientes</p></div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-blue-800">{detail.splitters?.length || 0}</p><p className="text-xs text-blue-600">Splitters</p></div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-gray-800">{detail.summary?.available_ports || 0}</p><p className="text-xs text-gray-600">Livres</p></div>
                </div>

                {detail.trays?.map((tray: any, ti: number) => (
                  <div key={ti} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-indigo-600 rounded text-white text-xs font-bold flex items-center justify-center">{tray.tray_number}</div>
                      <h4 className="text-sm font-semibold text-gray-700">Bandeja de Fusão #{tray.tray_number}</h4>
                      <span className="text-xs text-gray-400 ml-auto">{tray.splices.length}/{tray.total_ports || tray.splices.length} posições</span>
                    </div>

                    {activeTab === 'visual' ? (
                      <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
                        {Array.from({ length: tray.total_ports || 12 }, (_, i) => {
                          const splice = tray.splices.find((s: any) => s.position === i + 1);
                          return (
                            <div key={i} className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1 text-xs transition ${splice ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-200'}`}>
                              <span className="font-bold text-gray-400">{i + 1}</span>
                              {splice ? (
                                <>
                                  <div className="w-4 h-4 rounded-full border-2 mb-0.5" style={{ backgroundColor: splice.color_a || '#888' }}></div>
                                  <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: splice.color_b || '#888' }}></div>
                                </>
                              ) : <span className="text-gray-300 text-[8px]">vazio</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead><tr><th className="text-left py-1">#</th><th className="text-left py-1">Tipo</th><th className="text-left py-1">Fibra A</th><th className="text-left py-1">Fibra B</th><th className="text-left py-1">Perda</th><th className="text-left py-1">Executador</th></tr></thead>
                        <tbody>{tray.splices.map((s: any) => <tr key={s.position} className="border-t"><td className="py-1 font-bold">{s.position}</td><td className="py-1">{s.type}</td><td className="py-1"><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: s.color_a }}></span>{s.fiber_a}</td><td className="py-1"><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: s.color_b }}></span>{s.fiber_b}</td><td className="py-1">{s.loss_db ? `${s.loss_db}dB` : '-'}</td><td className="py-1">{s.performed_by || '-'}</td></tr>)}</tbody>
                      </table>
                    )}
                  </div>
                ))}

                {detail.splitters?.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Splitters Instalados</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {detail.splitters.map((sp: any) => (
                        <div key={sp.id} className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-blue-800">{sp.ratio || '?'}</p>
                          <p className="text-xs text-blue-600">{sp.insertion_loss_db}dB</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m6 0H1m6 0H3m0 0h.01M12 9h10m0 0h.01M5 9h.01M12 5h.01M17 5h.01M17 9h.01M12 13h.01M5 13h.01M12 17h.01M5 17h.01M5 21h.01M12 21h.01M17 21h.01M17 17h.01M12 9h10m-10 6h10" /></svg>
              <p>Selecione uma CTO à esquerda para ver o diagrama de fusão.</p>
              <p className="text-sm text-gray-400 mt-1">Visualize todas as fusões da bandeja com cores das fibras.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}