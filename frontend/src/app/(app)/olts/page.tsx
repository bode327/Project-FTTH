'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';
import HelpIcon from '@/components/HelpIcon';

export default function OltPage() {
  const [olts, setOlts] = useState<any[]>([]);
  const [pops, setPops] = useState<any[]>([]);
  const [oltModels, setOltModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', pop_id: '', catalog_olt_model_id: '', model: '', brand: '', slots_total: 16 });
  const [selectedOlt, setSelectedOlt] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);

  const load = () => {
    api.get(apiRoutes.olts).then(data => { if (data) setOlts(data.data || []); });
    api.get(apiRoutes.pops).then(data => { if (data) setPops(data.data || []); setLoading(false); });
    api.get('/catalogs/olt-model').then(data => { if (data) setOltModels(data.data || []); });
  };
  useEffect(() => { load(); }, []);

  const handleCatalogChange = (catalogId: string) => {
    const selectedModel = oltModels.find(m => m.id === catalogId);
    setForm(prev => ({
      ...prev,
      catalog_olt_model_id: catalogId,
      model: selectedModel?.model || '',
      brand: selectedModel?.brand || '',
      slots_total: selectedModel?.total_slots || 16
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(apiRoutes.olts, form);
      setShowForm(false);
      setForm({ name: '', pop_id: '', catalog_olt_model_id: '', model: '', brand: '', slots_total: 16 });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const viewSlots = async (oltId: string) => {
    const olt = olts.find(o => o.id === oltId);
    setSelectedOlt(olt);
    const data = await api.get(`${apiRoutes.olts}/${oltId}/slots`);
    setSlots(data?.data || []);
  };

  const addSlot = async (slotNumber: number) => {
    if (!selectedOlt) return;
    try {
      await api.post(`${apiRoutes.olts}/${selectedOlt.id}/slots`, { slot_number: slotNumber, max_ports: 16 });
      viewSlots(selectedOlt.id);
    } catch (err: any) { alert(err.message); }
  };

  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800', maintenance: 'bg-yellow-100 text-yellow-800', fault: 'bg-red-100 text-red-800' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">OLTs</h1>
          <HelpIcon title="OLT (Optical Line Termination)" description="OLT é o equipamento que converte sinais elétricos em ópticos. Cada OLT possui slots e portas PON que se conectam aos clientes." />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ Novo OLT</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold mb-4">Cadastrar OLT</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" placeholder="OLT Centro-01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">POP *</label>
              <select value={form.pop_id} onChange={e => setForm({...form, pop_id: e.target.value})} required className="w-full px-3 py-2 border rounded-lg">
                <option value="">Selecione o POP</option>
                {pops.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Modelo do Catálogo</label>
              <select value={form.catalog_olt_model_id} onChange={e => handleCatalogChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Selecione (opcional)</option>
                {oltModels.map(m => <option key={m.id} value={m.id}>{m.brand} - {m.model}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Modelo</label>
              <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="MA5800-X17" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Marca</label>
              <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Huawei" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slots</label>
              <input type="number" value={form.slots_total} onChange={e => setForm({...form, slots_total: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {selectedOlt && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Slots do OLT: {selectedOlt.name}</h3>
            <button onClick={() => setSelectedOlt(null)} className="text-gray-500 hover:text-gray-700">✕ Fechar</button>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {Array.from({ length: selectedOlt.slots_total || 16 }, (_, i) => {
              const slot = slots.find(s => s.slot_number === i + 1);
              return (
                <div key={i} className={`p-4 rounded-lg border-2 text-center cursor-pointer transition ${slot ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}
                  onClick={() => slot ? null : addSlot(i + 1)}>
                  <div className="text-xs font-medium text-gray-500">SLOT</div>
                  <div className="text-lg font-bold text-gray-800">{i + 1}</div>
                  <div className="text-xs text-gray-400">{slot ? `${slot.port_count || 0} portas` : 'Vazio'}</div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">Clique em um slot vazio para adicionar. Clique em um slot ocupado para gerenciar portas.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : olts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">Nenhum OLT cadastrado.</p>
            <p className="text-sm text-gray-400">Cadastre um POP primeiro, depois adicione OLTs.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slots</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {olts.map(olt => (
                <tr key={olt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{olt.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{olt.pop_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{olt.model || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{olt.slots_total || 16}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[olt.status] || 'bg-gray-100'}`}>{olt.status || 'active'}</span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button onClick={() => viewSlots(olt.id)} className="text-blue-600 text-sm hover:underline">Slots</button>
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