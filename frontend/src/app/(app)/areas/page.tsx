'use client';

import { useEffect, useState } from 'react';
import { api, apiRoutes } from '@/lib/api';

function parseDMS(str: string): number | null {
  const cleaned = str.trim().replace(/,/g, ' ');
  const decimalMatch = cleaned.match(/^(-?\d+\.?\d*)$/);
  if (decimalMatch) return parseFloat(decimalMatch[1]);
  const dmsRegex = /(\d+)[°:\s](\d+)['":\s](\d+\.?\d*)['"]?\s*([NSEWnsew]?)/i;
  const match = cleaned.match(dmsRegex);
  if (!match) return null;
  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  const dir = match[4].toUpperCase();
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (dir === 'S' || dir === 'W') decimal = -decimal;
  return decimal;
}

function formatDMS(val: number | string | null | undefined): string {
  if (!val && val !== 0) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  const abs = Math.abs(num);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = ((abs - deg) * 60 - min) * 60;
  const dir = num < 0 ? (val === num && num > 0 ? undefined : num < 0 ? (abs === num ? 'S' : 'W') : undefined) : (abs === num ? 'N' : 'E');
  if (dir) return `${deg}°${min}'${sec.toFixed(1)}"${dir}`;
  return num.toFixed(6);
}

function formatCoord(val: number | string | null | undefined): string {
  if (!val && val !== 0) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  return num.toFixed(6);
}

export default function AreasPage() {
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', lat: '', lng: '', radius_m: '' });
  const [coordFormat, setCoordFormat] = useState<'decimal' | 'dms'>('decimal');

  const load = () => api.get(apiRoutes.areas).then(data => { if (data) setAreas(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const latVal = parseDMS(form.lat);
      const lngVal = parseDMS(form.lng);
      const payload = { name: form.name, description: form.description, lat: latVal ?? undefined, lng: lngVal ?? undefined, radius_m: form.radius_m ? parseInt(form.radius_m) : undefined };
      if (editItem) {
        await api.put(`${apiRoutes.areas}/${editItem.id}`, payload);
      } else {
        await api.post(apiRoutes.areas, payload);
      }
      setShowForm(false);
      setEditItem(null);
      setForm({ name: '', description: '', lat: '', lng: '', radius_m: '' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = (area: any) => {
    setEditItem(area);
    setCoordFormat('decimal');
    setForm({ name: area.name || '', description: area.description || '', lat: formatCoord(area.lat), lng: formatCoord(area.lng), radius_m: area.radius_m || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir área?')) return;
    try {
      await api.delete(`${apiRoutes.areas}/${id}`);
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditItem(null);
    setForm({ name: '', description: '', lat: '', lng: '', radius_m: '' });
  };

  const displayLat = coordFormat === 'dms' ? formatDMS(form.lat) : form.lat;
  const displayLng = coordFormat === 'dms' ? formatDMS(form.lng) : form.lng;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Áreas Personalizadas</h1>
        <button onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', description: '', lat: '', lng: '', radius_m: '' }); setCoordFormat('decimal'); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Nova Área</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">{editItem ? 'Editar' : 'Nova'} Área</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Descrição</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Raio (metros)</label><input type="number" value={form.radius_m} onChange={e => setForm({...form, radius_m: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><label className="block text-sm font-medium mb-1">Latitude</label><input value={displayLat} onChange={e => setForm({...form, lat: e.target.value})} placeholder={coordFormat === 'decimal' ? '-20.9519' : "20°04'06.0\"S"} className="w-full px-3 py-2 border rounded-lg" /></div>
              <button type="button" onClick={() => setCoordFormat(f => f === 'decimal' ? 'dms' : 'decimal')} className="px-2 py-2 text-xs bg-gray-100 border rounded hover:bg-gray-200 whitespace-nowrap" title="Alternar formato">{coordFormat === 'decimal' ? 'DMS' : 'DEC'}</button>
            </div>
            <div><label className="block text-sm font-medium mb-1">Longitude</label><input value={displayLng} onChange={e => setForm({...form, lng: e.target.value})} placeholder={coordFormat === 'decimal' ? '-44.2105' : "44°15'33.8\"W"} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">{editItem ? 'Salvar' : 'Criar'}</button>
              <button type="button" onClick={handleCancel} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-2">Formatos aceitos: decimal (-20.9519) ou DMS (20&deg;04&apos;06.0&quot;S)</p>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : areas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma área cadastrada.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projetos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {areas.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{a.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{a.description || '-'}</td>
                  <td className="px-6 py-4 text-sm">{a.project_count || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(a)} className="text-blue-600 text-sm hover:underline mr-3">Editar</button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
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