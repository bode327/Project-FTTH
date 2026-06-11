'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

const BASE = '/assets/kml-icons';

const iconOptions = [
  { id: 'red-pushpin', url: `${BASE}/pushpin/red-pushpin.png`, label: 'Pushpin Vermelho' },
  { id: 'ylw-pushpin', url: `${BASE}/pushpin/ylw-pushpin.png`, label: 'Pushpin Amarelo' },
  { id: 'grn-pushpin', url: `${BASE}/pushpin/grn-pushpin.png`, label: 'Pushpin Verde' },
  { id: 'ltblu-pushpin', url: `${BASE}/pushpin/ltblu-pushpin.png`, label: 'Pushpin Azul claro' },
  { id: 'purple-pushpin', url: `${BASE}/pushpin/purple-pushpin.png`, label: 'Pushpin Roxo' },
  { id: 'paddle/red-circle', url: `${BASE}/paddle/red-circle.png`, label: 'Círculo Vermelho' },
  { id: 'paddle/ylw-circle', url: `${BASE}/paddle/ylw-circle.png`, label: 'Círculo Amarelo' },
  { id: 'paddle/grn-circle', url: `${BASE}/paddle/grn-circle.png`, label: 'Círculo Verde' },
  { id: 'paddle/blu-circle', url: `${BASE}/paddle/blu-circle.png`, label: 'Círculo Azul' },
  { id: 'paddle/ylw-square', url: `${BASE}/paddle/ylw-square.png`, label: 'Quadrado Amarelo' },
  { id: 'paddle/grn-square', url: `${BASE}/paddle/grn-square.png`, label: 'Quadrado Verde' },
  { id: 'paddle/red-diamond', url: `${BASE}/paddle/red-diamond.png`, label: 'Diamante Vermelho' },
  { id: 'paddle/ylw-diamond', url: `${BASE}/paddle/ylw-diamond.png`, label: 'Diamante Amarelo' },
  { id: 'shapes/donut', url: `${BASE}/shapes/donut.png`, label: 'Donut' },
  { id: 'shapes/placemark_circle', url: `${BASE}/shapes/placemark_circle.png`, label: 'Círculo Place' },
  { id: 'shapes/placemark_square', url: `${BASE}/shapes/placemark_square.png`, label: 'Quadrado Place' },
  { id: 'shapes/star', url: `${BASE}/shapes/star.png`, label: 'Estrela' },
  { id: 'shapes/flag', url: `${BASE}/shapes/flag.png`, label: 'Bandeira' },
];

const colorOptions = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function LegendPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', node_type: 'cto', icon_id: 'ylw-pushpin', color: '#22c55e', description: '' });

  const load = () => api.get(apiRoutes.legend).then(data => { if (data) setItems(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`${apiRoutes.legend}/${editingItem.id}`, form);
      } else {
        await api.post(apiRoutes.legend, form);
      }
      setShowForm(false);
      setEditingItem(null);
      setForm({ name: '', node_type: 'cto', icon_id: 'ylw-pushpin', color: '#22c55e', description: '' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setForm({ name: item.name, node_type: item.node_type, icon_id: item.icon_id, color: item.color, description: item.description || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir item da legenda?')) return;
    try { await api.delete(`${apiRoutes.legend}/${id}`); load(); } catch (err: any) { alert(err.message); }
  };

  const getIconUrl = (iconId: string) => {
    if (iconId.startsWith('paddle/') || iconId.startsWith('shapes/')) return `${BASE}/${iconId}.png`;
    return `${BASE}/pushpin/${iconId}.png`;
  };

  const selectedIcon = iconOptions.find(i => i.id === form.icon_id);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Legenda do Mapa</h1>
        <button onClick={() => { setShowForm(true); setEditingItem(null); setForm({ name: '', node_type: 'cto', icon_id: 'ylw-pushpin', color: '#22c55e', description: '' }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo Item</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Crie itens de legenda personalizados para identificar tipos de nós no mapa. Depois selecione ao criar ou editar nós.</p>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">{editingItem ? 'Editar' : 'Novo'} Item de Legenda</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: CTO Distribuição + Atendimento" /></div>
            <div><label className="block text-sm font-medium mb-1">Tipo de Nó *</label>
              <select value={form.node_type} onChange={e => setForm({...form, node_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="pop">POP</option><option value="cto">CTO</option><option value="ce">CE</option><option value="client">Cliente</option><option value="dgo">DGO</option>
              </select>
            </div>
            <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Ícone</label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map(icon => (
                  <button key={icon.id} type="button" onClick={() => setForm({...form, icon_id: icon.id})} className={`p-1 rounded border-2 transition ${form.icon_id === icon.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`} title={icon.label}>
                    <img src={icon.url} alt={icon.label} className="w-full" />
                  </button>
                ))}
              </div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Cor</label>
              <div className="flex gap-2">
                {colorOptions.map(c => (
                  <button key={c} type="button" onClick={() => setForm({...form, color: c})} className={`w-8 h-8 rounded-full border-2 transition ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Descrição</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Descrição opcional..." /></div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Preview</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {selectedIcon && <img src={selectedIcon.url} alt="" className="w-10 h-10" />}
                <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: form.color }} />
                <span className="font-medium">{form.name || 'Nome do item'}</span>
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">{editingItem ? 'Salvar' : 'Criar'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Carregando...</div> : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum item de legenda. Clique em "+ Novo Item" para começar.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ícone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><img src={getIconUrl(item.icon_id)} alt="" className="w-8 h-8" /></td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 uppercase">{item.node_type}</td>
                  <td className="px-6 py-4"><div className="w-6 h-6 rounded-full" style={{ backgroundColor: item.color }} /></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 text-sm hover:underline mr-3">Editar</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
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