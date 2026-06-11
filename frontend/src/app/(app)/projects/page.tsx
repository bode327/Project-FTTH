'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', area_id: '', status: 'draft' });

  const load = () => {
    api.get(apiRoutes.projects).then(data => { if (data) setProjects(data.data || []); });
    api.get(apiRoutes.areas).then(data => { if (data) setAreas(data.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: form.name, description: form.description, area_id: form.area_id || null, status: form.status };
      if (editItem) {
        await api.put(`${apiRoutes.projects}/${editItem.id}`, payload);
      } else {
        await api.post(apiRoutes.projects, payload);
      }
      setShowForm(false);
      setEditItem(null);
      setForm({ name: '', description: '', area_id: '', status: 'draft' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = (project: any) => {
    setEditItem(project);
    setForm({ name: project.name || '', description: project.description || '', area_id: project.area_id || '', status: project.status || 'draft' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir projeto?')) return;
    try {
      await api.delete(`${apiRoutes.projects}/${id}`);
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditItem(null);
    setForm({ name: '', description: '', area_id: '', status: 'draft' });
  };

  const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-800', planning: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800', executed: 'bg-purple-100 text-purple-800' };
  const statusLabels: Record<string, string> = { draft: 'Rascunho', planning: 'Em Planejamento', approved: 'Aprovado', executed: 'Executado' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Projetos</h1>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Modo Projeto</span>
        </div>
        <button onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', description: '', area_id: '', status: 'draft' }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo Projeto</button>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
        <strong>Modo Projeto:</strong> Projetos em rascunho não afetam sua rede documentada. Você pode testá-los e convertê-los para execução posteriormente.
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">{editItem ? 'Editar' : 'Novo'} Projeto</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Área</label><select value={form.area_id} onChange={e => setForm({...form, area_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Sem área</option>{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="draft">Rascunho</option><option value="planning">Em Planejamento</option><option value="approved">Aprovado</option><option value="executed">Executado</option></select></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Descrição</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={3} /></div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">{editItem ? 'Salvar' : 'Criar'}</button>
              <button type="button" onClick={handleCancel} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum projeto criado.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado por</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-sm">{p.area_name || '-'}</td>
                  <td className="px-6 py-4"><span className={"px-2 py-1 rounded-full text-xs " + (statusColors[p.status] || '')}>{statusLabels[p.status] || p.status}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.created_by_name || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(p)} className="text-blue-600 text-sm hover:underline mr-3">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
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