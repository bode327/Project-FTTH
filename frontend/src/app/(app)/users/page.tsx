'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'tecnico' });

  const load = () => api.get(apiRoutes.users).then(data => { if (data) setUsers(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(apiRoutes.users, form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'tecnico' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const roleColors: Record<string, string> = { admin: 'bg-purple-100 text-purple-800', projetista: 'bg-blue-100 text-blue-800', tecnico: 'bg-green-100 text-green-800', vendedor: 'bg-yellow-100 text-yellow-800', viabilidade: 'bg-teal-100 text-teal-800' };
  const roleLabels: Record<string, string> = { admin: 'Admin', projetista: 'Projetista', tecnico: 'Técnico', vendedor: 'Vendedor', viabilidade: 'Viabilidade' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Novo Usuário</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">E-mail *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Senha *</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div>
              <label className="block text-sm font-medium mb-1">Função</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="tecnico">Técnico</option>
                <option value="projetista">Projetista</option>
                <option value="vendedor">Vendedor</option>
                <option value="viabilidade">Viabilidade</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={"px-2 py-1 rounded-full text-xs " + (roleColors[u.role] || '')}>{roleLabels[u.role] || u.role}</span>
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