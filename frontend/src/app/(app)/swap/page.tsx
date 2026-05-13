'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const EQUIP_TYPES = [
  { key: 'olt_chassis', label: 'OLT Chassis', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2' },
  { key: 'switches', label: 'Switches', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m6 0H1m6 0H3m0 0h.01M12 9h10m0 0h.01M12 5h10m0 0h.01M17 5h.01M17 9h.01M17 13h.01M17 17h.01' },
  { key: 'routers', label: 'Routers', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'ctos', label: 'CTOs', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'ces', label: 'CEs', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z' },
  { key: 'splitters', label: 'Splitters', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { key: 'clients', label: 'Clientes', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { key: 'pops', label: 'POPs', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
];

export default function SwapPage() {
  const [equipType, setEquipType] = useState('olt_chassis');
  const [oldEquipment, setOldEquipment] = useState<any[]>([]);
  const [newEquipment, setNewEquipment] = useState<any[]>([]);
  const [selectedOld, setSelectedOld] = useState<any>(null);
  const [selectedNew, setSelectedNew] = useState<any>(null);
  const [oldDetails, setOldDetails] = useState<any>(null);
  const [newDetails, setNewDetails] = useState<any>(null);
  const [portMappings, setPortMappings] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'swap' | 'history'>('swap');

  useEffect(() => {
    loadEquipment();
    loadHistory();
  }, [equipType]);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/swap/equipment?type=${equipType}`);
      const active = (data?.data || []).filter((e: any) => e.status !== 'decommissioned');
      setOldEquipment(active);
      setNewEquipment(active);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    try {
      const data = await api.get(`/swap/swap-history?equipment_type=${equipType}`);
      setHistory(data?.data || []);
    } catch (e) { console.error(e); }
  };

  const handleOldSelect = async (e: any) => {
    const id = e.target.value;
    if (!id) { setSelectedOld(null); setOldDetails(null); return; }
    setSelectedOld(id);
    try {
      const data = await api.get(`/swap/equipment/${equipType}/${id}`);
      setOldDetails(data?.data);
      if (data?.data?.ports) setPortMappings(data.data.ports.map((p: any) => ({ old_port: p.port_number, new_port: '', vlan: p.vlan, lacp_group: p.lacp_group })));
      else if (data?.data?.slots) setPortMappings(data.data.slots.flatMap((s: any) => Array.from({ length: s.port_count }, (_, i) => ({ old_slot: s.slot_number, old_port: i + 1, new_slot: '', new_port: '', fiber_id: '' }))));
      else setPortMappings([]);
    } catch (err) { console.error(err); }
  };

  const handleNewSelect = async (e: any) => {
    const id = e.target.value;
    if (!id) { setSelectedNew(null); setNewDetails(null); return; }
    setSelectedNew(id);
    try {
      const data = await api.get(`/swap/equipment/${equipType}/${id}`);
      setNewDetails(data?.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async () => {
    if (!selectedOld || !selectedNew) { alert('Selecione o equipamento antigo e o novo'); return; }
    if (selectedOld === selectedNew) { alert('Selecione equipamentos diferentes'); return; }
    setLoading(true);
    try {
      const reconnectFibers = portMappings.filter(p => p.fiber_id);
      const res = await api.post('/swap/swap', {
        equipment_type: equipType,
        old_id: selectedOld,
        new_id: selectedNew,
        reason,
        notes,
        port_mapping: portMappings.filter(p => p.new_port || p.new_slot),
        reconnect_fibers: reconnectFibers,
      });
      setResult(res);
      setSelectedOld(null); setSelectedNew(null); setOldDetails(null); setNewDetails(null);
      setPortMappings([]); setReason(''); setNotes('');
      loadEquipment(); loadHistory();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const updateMapping = (index: number, field: string, value: any) => {
    setPortMappings(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const formatEquip = (e: any) => `${e.name || e.serial_number || e.id}${e.brand ? ` (${e.brand})` : ''}${e.pop_name ? ` @ ${e.pop_name}` : ''}`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Substituir Equipamento</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {(['swap', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition " + (tab === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}>
            {t === 'swap' ? 'Nova Substituição' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Antigo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Novo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Por</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{EQUIP_TYPES.find(t => t.key === h.equipment_type)?.label || h.equipment_type}</td>
                  <td className="px-4 py-3 text-sm text-red-600">{h.old_name || h.old_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-green-600">{h.new_name || h.new_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{h.reason || '-'}</td>
                  <td className="px-4 py-3 text-sm">{h.migrated_by_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{h.created_at ? new Date(h.created_at).toLocaleString('pt-BR') : '-'}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhuma substituição registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Selecionar Tipo de Equipamento</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {EQUIP_TYPES.map(et => (
                <button key={et.key} onClick={() => { setEquipType(et.key); setSelectedOld(null); setSelectedNew(null); setOldDetails(null); setNewDetails(null); setPortMappings([]); }}
                  className={"p-3 rounded-lg border text-center text-sm transition " + (equipType === et.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300')}>
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={et.icon} /></svg>
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-red-600 mb-4">Equipamento Antigo (a ser substituído)</h3>
              <select value={selectedOld || ''} onChange={handleOldSelect} className="w-full px-3 py-2 border rounded-lg mb-4">
                <option value="">Selecione...</option>
                {oldEquipment.map(e => <option key={e.id} value={e.id}>{formatEquip(e)}</option>)}
              </select>

              {oldDetails && (
                <div className="bg-red-50 rounded-lg p-4 space-y-1 text-sm">
                  <p className="font-bold text-red-700">{oldDetails.name || oldDetails.serial_number}</p>
                  {oldDetails.brand && <p><span className="font-medium">Marca:</span> {oldDetails.brand}</p>}
                  {oldDetails.model && <p><span className="font-medium">Modelo:</span> {oldDetails.model}</p>}
                  {oldDetails.management_ip && <p><span className="font-medium">IP:</span> {oldDetails.management_ip}</p>}
                  {oldDetails.pop_name && <p><span className="font-medium">POP:</span> {oldDetails.pop_name}</p>}
                  {oldDetails.address && <p><span className="font-medium">Endereço:</span> {oldDetails.address}</p>}
                  {oldDetails.slots && <p><span className="font-medium">Slots:</span> {oldDetails.slots.length} ({oldDetails.slots.reduce((a: number, s: any) => a + (s.port_count || 0), 0)} portas)</p>}
                  {oldDetails.ports && <p><span className="font-medium">Portas:</span> {oldDetails.ports.length} ({oldDetails.ports.filter((p: any) => p.status === 'up').length} ativas)</p>}
                  {oldDetails.gbics && <p><span className="font-medium">GBICs:</span> {oldDetails.gbics.length}</p>}
                  {oldDetails.interfaces && <p><span className="font-medium">Interfaces:</span> {oldDetails.interfaces.length}</p>}
                  {oldDetails.ratio && <p><span className="font-medium">Ratio:</span> {oldDetails.ratio}</p>}
                  {oldDetails.capacity && <p><span className="font-medium">Capacidade:</span> {oldDetails.capacity}</p>}
                  {oldDetails.plan_mbps && <p><span className="font-medium">Plano:</span> {oldDetails.plan_mbps} Mbps</p>}
                  {oldDetails.ont_serial && <p><span className="font-medium">Serial ONT:</span> {oldDetails.ont_serial}</p>}
                  <p className="mt-2"><span className="font-medium">Status:</span> <span className={"px-2 py-0.5 rounded text-xs " + (oldDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{oldDetails.status}</span></p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-green-600 mb-4">Novo Equipamento</h3>
              <select value={selectedNew || ''} onChange={handleNewSelect} className="w-full px-3 py-2 border rounded-lg mb-4">
                <option value="">Selecione...</option>
                {newEquipment.filter(e => e.id !== selectedOld).map(e => <option key={e.id} value={e.id}>{formatEquip(e)}</option>)}
              </select>

              {newDetails && (
                <div className="bg-green-50 rounded-lg p-4 space-y-1 text-sm">
                  <p className="font-bold text-green-700">{newDetails.name || newDetails.serial_number}</p>
                  {newDetails.brand && <p><span className="font-medium">Marca:</span> {newDetails.brand}</p>}
                  {newDetails.model && <p><span className="font-medium">Modelo:</span> {newDetails.model}</p>}
                  {newDetails.management_ip && <p><span className="font-medium">IP:</span> {newDetails.management_ip}</p>}
                  {newDetails.pop_name && <p><span className="font-medium">POP:</span> {newDetails.pop_name}</p>}
                  {newDetails.slots && <p><span className="font-medium">Slots:</span> {newDetails.slots.length} ({newDetails.slots.reduce((a: number, s: any) => a + (s.port_count || 0), 0)} portas)</p>}
                  {newDetails.ports && <p><span className="font-medium">Portas:</span> {newDetails.ports.length}</p>}
                  <p className="mt-2"><span className="font-medium">Status:</span> <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">{newDetails.status}</span></p>
                </div>
              )}
            </div>
          </div>

          {(oldDetails?.slots || oldDetails?.ports || portMappings.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Mapeamento de Portas / Fibras</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Porta Antiga</th>
                      <th className="px-3 py-2 text-left">Porta Nova</th>
                      {equipType === 'olt_chassis' && <th className="px-3 py-2 text-left">Slot Antigo</th>}
                      {equipType === 'olt_chassis' && <th className="px-3 py-2 text-left">Slot Novo</th>}
                      {(equipType === 'switches') && <th className="px-3 py-2 text-left">VLAN</th>}
                      {(equipType === 'switches') && <th className="px-3 py-2 text-left">LACP</th>}
                      {equipType === 'splitters' && <th className="px-3 py-2 text-left">Fibra</th>}
                      <th className="px-3 py-2 text-left">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {portMappings.map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-gray-600">{equipType === 'olt_chassis' ? `S${m.old_slot}/P${m.old_port}` : m.old_port}</td>
                        <td className="px-3 py-2">
                          <input type="text" value={equipType === 'olt_chassis' ? `${m.new_slot || ''}/${m.new_port || ''}` : m.new_port || ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (equipType === 'olt_chassis' && val.includes('/')) {
                                const [s, p] = val.split('/');
                                updateMapping(i, 'new_slot', s); updateMapping(i, 'new_port', p);
                              } else {
                                updateMapping(i, 'new_port', val);
                              }
                            }}
                            placeholder="S/P" className="px-2 py-1 border rounded w-20 text-sm" />
                        </td>
                        {equipType === 'olt_chassis' && <td className="px-3 py-2 text-gray-500">S{m.old_slot}</td>}
                        {equipType === 'olt_chassis' && <td className="px-3 py-2"><input type="text" value={m.new_slot || ''} onChange={e => updateMapping(i, 'new_slot', e.target.value)} className="px-2 py-1 border rounded w-16 text-sm" /></td>}
                        {equipType === 'switches' && <td className="px-3 py-2"><input type="text" value={m.vlan || ''} onChange={e => updateMapping(i, 'vlan', e.target.value)} className="px-2 py-1 border rounded w-16 text-sm" /></td>}
                        {equipType === 'switches' && <td className="px-3 py-2"><input type="text" value={m.lacp_group || ''} onChange={e => updateMapping(i, 'lacp_group', e.target.value)} className="px-2 py-1 border rounded w-16 text-sm" /></td>}
                        {equipType === 'splitters' && <td className="px-3 py-2"><input type="text" value={m.fiber_id || ''} onChange={e => updateMapping(i, 'fiber_id', e.target.value)} className="px-2 py-1 border rounded w-24 text-sm" placeholder="Fiber ID" /></td>}
                        <td className="px-3 py-2 text-gray-400 text-xs">{m.status === 'migrated' ? 'Migrado' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Detalhes da Substituição</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                <select value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Selecione...</option>
                  <option value="upgrade">Upgrade / Maior capacidade</option>
                  <option value="fault">Falha / Defeito</option>
                  <option value="capacity">Capacidade esgotada</option>
                  <option value="maintenance">Manutenção preventiva</option>
                  <option value="technology">Troca de tecnologia</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais..." className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!selectedOld || !selectedNew || !reason || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
              {loading ? 'Processando...' : 'Confirmar Substituição'}
            </button>
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-bold text-green-700 mb-2">Substituição Realizada!</h3>
              <p className="text-sm text-green-700">{result.message}</p>
              <p className="text-sm text-green-600 mt-1">Conexões migradas: {result.migrated_connections?.length || 0}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
