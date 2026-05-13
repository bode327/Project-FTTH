'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type CatalogType = 'olt-model' | 'pon-card' | 'gbic' | 'ont' | 'switch' | 'router' | 'dio' | 'dgo' | 'rj' | 'splitter' | 'cable-type' | 'duct' | 'accessory' | 'network-asset' | 'fiber-color';

const TABS: { key: CatalogType; label: string }[] = [
  { key: 'olt-model', label: 'OLT Models' },
  { key: 'pon-card', label: 'Placas PON' },
  { key: 'gbic', label: 'GBICs' },
  { key: 'ont', label: 'ONTs' },
  { key: 'switch', label: 'Switches' },
  { key: 'router', label: 'Routers' },
  { key: 'dio', label: 'DIOs' },
  { key: 'dgo', label: 'DGOs' },
  { key: 'rj', label: 'Caixas RJ' },
  { key: 'splitter', label: 'Splitters' },
  { key: 'cable-type', label: 'Tipos de Cabo' },
  { key: 'duct', label: 'Dutos' },
  { key: 'accessory', label: 'Acessórios' },
  { key: 'network-asset', label: 'Ativos de Rede' },
  { key: 'fiber-color', label: 'Cores de Fibra' },
];

const FIELD_CONFIGS: Record<CatalogType, { label: string; type: string; options?: string[]; field: string }[]> = {
  'olt-model': [
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'Total Slots', type: 'number', field: 'total_slots' },
    { label: 'Max Power (W)', type: 'number', field: 'max_power_watts' },
    { label: 'Form Factor', type: 'text', field: 'form_factor' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'pon-card': [
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'PON Type', type: 'select', field: 'pon_type', options: ['GPON', 'GPON_B+', 'XGS_PON', 'NGPON2', 'GPON_Class_C+', 'GPON_Class_D'] },
    { label: 'Ports', type: 'number', field: 'ports' },
    { label: 'TX Power (dBm)', type: 'number', field: 'tx_power_dbm' },
    { label: 'RX Sensitivity (dBm)', type: 'number', field: 'rx_sensitivity_dbm' },
    { label: 'Budget Power (dBm)', type: 'number', field: 'budget_power_dbm' },
    { label: 'Max Split Ratio', type: 'text', field: 'max_split_ratio' },
    { label: 'Compatible Chassis', type: 'text', field: 'compatible_chassis' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'gbic': [
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'Type', type: 'select', field: 'type', options: ['SFP', 'SFP+', 'SFP28', 'XFP', 'QSFP+', 'QSFP28'] },
    { label: 'Wavelengths', type: 'checkbox', field: 'wavelength_range', options: ['1310nm', '1490nm', '1550nm', 'CWDM', 'DWDM'] },
    { label: 'Min Output (dBm)', type: 'number', field: 'min_output_dbm' },
    { label: 'Max Output (dBm)', type: 'number', field: 'max_output_dbm' },
    { label: 'Budget Power (dBm)', type: 'number', field: 'budget_power_dbm' },
    { label: 'Max Distance (km)', type: 'number', field: 'max_distance_km' },
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'ont': [
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'PON Compatibility', type: 'checkbox', field: 'pon_compatibility', options: ['GPON', 'GPON_B+', 'XGS_PON', 'NGPON2', 'GPON_Class_C+', 'GPON_Class_D'] },
    { label: 'Gigabit Ports', type: 'number', field: 'ports_gigabit' },
    { label: 'VoIP Ports', type: 'number', field: 'ports_voip' },
    { label: 'CATV Ports', type: 'number', field: 'ports_catv' },
    { label: 'WiFi Standard', type: 'text', field: 'wifi_standard' },
    { label: 'WiFi Max (Mbps)', type: 'number', field: 'wifi_max_mbps' },
    { label: 'RX Min Power (dBm)', type: 'number', field: 'rx_power_min_dbm' },
    { label: 'TX Power (dBm)', type: 'number', field: 'tx_power_dbm' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'switch': [
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'Type', type: 'select', field: 'type', options: ['managed', 'unmanaged'] },
    { label: 'Layer', type: 'select', field: 'layer', options: ['L2', 'L3'] },
    { label: 'Ports', type: 'number', field: 'ports' },
    { label: 'SFP Slots', type: 'number', field: 'sfp_slots' },
    { label: 'PoE Ports', type: 'number', field: 'poe_ports' },
    { label: 'PoE Budget (W)', type: 'number', field: 'poe_budget_watts' },
    { label: 'Max Power (W)', type: 'number', field: 'max_power_watts' },
    { label: 'Form Factor', type: 'text', field: 'form_factor' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'router': [
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'Type', type: 'select', field: 'type', options: ['router', 'firewall'] },
    { label: 'WAN Ports', type: 'number', field: 'wan_ports' },
    { label: 'LAN Ports', type: 'number', field: 'lan_ports' },
    { label: 'Throughput (Mbps)', type: 'number', field: 'throughput_mbps' },
    { label: 'VPN Support', type: 'checkbox', field: 'vpn_support' },
    { label: 'Firewall', type: 'checkbox', field: 'firewall' },
    { label: 'Max Power (W)', type: 'number', field: 'max_power_watts' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'dio': [
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'Total Ports', type: 'number', field: 'total_ports' },
    { label: 'Type', type: 'select', field: 'type', options: ['rack', 'wall'] },
    { label: 'Height (U)', type: 'number', field: 'height_units' },
    { label: 'Splice Capacity', type: 'number', field: 'splice_capacity' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'dgo': [
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Capacity (fibers)', type: 'number', field: 'capacity_fibers' },
    { label: 'Splice Trays', type: 'number', field: 'splice_trays' },
    { label: 'Max Splitters', type: 'number', field: 'max_splitters' },
    { label: 'Mounting', type: 'select', field: 'mounting', options: ['aereo', 'subterraneo', 'parede'] },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'rj': [
    { label: 'Model', type: 'text', field: 'model' },
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Type', type: 'select', field: 'type', options: ['rj45', 'sc', 'apc'] },
    { label: 'Capacity (fibers)', type: 'number', field: 'capacity_fibers' },
    { label: 'Built-in Splitter', type: 'checkbox', field: 'built_in_splitter' },
    { label: 'Mounting', type: 'text', field: 'mounting' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'splitter': [
    { label: 'Ratio', type: 'text', field: 'ratio' },
    { label: 'Type', type: 'text', field: 'type' },
    { label: 'Insertion Loss (dB)', type: 'number', field: 'insertion_loss_db' },
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'cable-type': [
    { label: 'Nome', type: 'text', field: 'name' },
    { label: 'Qtd. Fibras', type: 'number', field: 'fiber_count' },
    { label: 'Qtd. Tubos', type: 'number', field: 'tube_count' },
    { label: 'Cor no mapa', type: 'color', field: 'color' },
    { label: 'Espessura da linha', type: 'select', field: 'stroke_width', options: ['1', '2', '3', '4', '5', '6', '7', '8'] },
    { label: 'Linha tracejada', type: 'checkbox', field: 'dashed' },
    { label: 'Tipo de capa', type: 'text', field: 'jacket_type' },
    { label: 'Compatível com duto', type: 'checkbox', field: 'duct_compatible' },
    { label: 'Descrição', type: 'textarea', field: 'description' },
  ],
  'duct': [
    { label: 'Name', type: 'text', field: 'name' },
    { label: 'Diameter (mm)', type: 'number', field: 'diameter_mm' },
    { label: 'Type', type: 'select', field: 'type', options: ['subterraneo', 'aereo', 'microduto'] },
    { label: 'Color', type: 'text', field: 'color' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'accessory': [
    { label: 'Category', type: 'select', field: 'category', options: ['splice_sleeve', 'pigtail', 'adapter', 'connector', 'ferrule', 'other'] },
    { label: 'Name', type: 'text', field: 'name' },
    { label: 'Brand', type: 'text', field: 'brand' },
    { label: 'Unit', type: 'text', field: 'unit' },
    { label: 'Description', type: 'textarea', field: 'description' },
  ],
  'network-asset': [
    { label: 'Categoria', type: 'select', field: 'category', options: ['patchcord', 'pigtail', 'odf', 'adaptador', 'conector', 'tubete', 'embreagem', 'caixa_passagem', 'lancamento', 'cordao', 'splitter_outdoor', 'equipamento_cliente', 'outro'] },
    { label: 'Nome', type: 'text', field: 'name' },
    { label: 'Marca', type: 'text', field: 'brand' },
    { label: 'Modelo', type: 'text', field: 'model' },
    { label: 'Especificações', type: 'textarea', field: 'specifications' },
    { label: 'Unidade', type: 'text', field: 'unit' },
    { label: 'Estoque', type: 'number', field: 'stock_quantity' },
    { label: 'Estoque Mínimo', type: 'number', field: 'min_stock' },
    { label: 'Custo Unitário', type: 'number', field: 'cost' },
    { label: 'Descrição', type: 'textarea', field: 'description' },
  ],
  'fiber-color': [
    { label: 'Sequence', type: 'number', field: 'sequence' },
    { label: 'Color', type: 'text', field: 'color' },
    { label: 'Color Code', type: 'text', field: 'color_code' },
  ],
};

const DISPLAY_COLUMNS: Record<CatalogType, string[]> = {
  'olt-model': ['brand', 'model', 'total_slots', 'max_power_watts', 'form_factor'],
  'pon-card': ['brand', 'model', 'pon_type', 'ports', 'tx_power_dbm', 'rx_sensitivity_dbm', 'max_split_ratio'],
  'gbic': ['model', 'type', 'wavelength_range', 'min_output_dbm', 'max_output_dbm', 'max_distance_km', 'brand'],
  'ont': ['brand', 'model', 'pon_compatibility', 'ports_gigabit', 'ports_voip', 'ports_catv', 'wifi_standard', 'wifi_max_mbps'],
  'switch': ['brand', 'model', 'type', 'layer', 'ports', 'sfp_slots', 'poe_ports'],
  'router': ['brand', 'model', 'type', 'wan_ports', 'lan_ports', 'throughput_mbps', 'vpn_support', 'firewall'],
  'dio': ['brand', 'model', 'total_ports', 'type', 'height_units', 'splice_capacity'],
  'dgo': ['model', 'brand', 'capacity_fibers', 'splice_trays', 'max_splitters', 'mounting'],
  'rj': ['model', 'brand', 'type', 'capacity_fibers', 'built_in_splitter', 'mounting'],
  'splitter': ['ratio', 'type', 'insertion_loss_db', 'brand'],
  'cable-type': ['name', 'fiber_count', 'color', 'stroke_width', 'dashed'],
  'duct': ['name', 'diameter_mm', 'type', 'color'],
  'accessory': ['category', 'name', 'brand', 'unit'],
  'network-asset': ['category', 'name', 'brand', 'model', 'stock_quantity', 'min_stock', 'cost'],
  'fiber-color': ['sequence', 'color', 'color_code'],
};

function getEmptyForm(type: CatalogType): Record<string, any> {
  const fields = FIELD_CONFIGS[type];
  const form: Record<string, any> = {};
  fields.forEach(f => {
    if (f.type === 'checkbox') {
      form[f.field] = f.options ? [] : false;
    } else {
      form[f.field] = '';
    }
  });
  return form;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export default function CatalogsPage() {
  const [activeTab, setActiveTab] = useState<CatalogType>('olt-model');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, [activeTab]);

  useEffect(() => {
    setForm(getEmptyForm(activeTab));
    setEditItem(null);
    setShowForm(false);
  }, [activeTab]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/catalogs/${activeTab}`);
      setItems(data?.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editItem) {
        await api.put(`/catalogs/${activeTab}/${editItem.id}`, payload);
      } else {
        await api.post(`/catalogs/${activeTab}`, payload);
      }
      setShowForm(false);
      setEditItem(null);
      setForm(getEmptyForm(activeTab));
      loadItems();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    const newForm: Record<string, any> = {};
    FIELD_CONFIGS[activeTab].forEach(f => {
      if (f.type === 'checkbox') {
        if (f.options) {
          newForm[f.field] = item[f.field] ? (Array.isArray(item[f.field]) ? item[f.field] : [item[f.field]]) : [];
        } else {
          newForm[f.field] = !!item[f.field];
        }
      } else {
        newForm[f.field] = item[f.field] ?? '';
      }
    });
    setForm(newForm);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir item?')) return;
    try {
      await api.delete(`/catalogs/${activeTab}/${id}`);
      loadItems();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFieldChange = (field: string, value: any, type: string, options?: string[]) => {
    if (type === 'checkbox' && options) {
      const current = form[field] || [];
      if (current.includes(value)) {
        setForm({ ...form, [field]: current.filter((v: string) => v !== value) });
      } else {
        setForm({ ...form, [field]: [...current, value] });
      }
    } else {
      setForm({ ...form, [field]: value });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(getEmptyForm(activeTab));
  };

  const fields = FIELD_CONFIGS[activeTab];
  const columns = DISPLAY_COLUMNS[activeTab];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Catálogos</h1>
      </div>

      <div className="flex gap-1 mb-6 flex-wrap border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editItem ? 'Editar' : 'Adicionar'} {TABS.find(t => t.key === activeTab)?.label}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {fields.map(f => (
                <div key={f.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={form[f.field] || ''}
                      onChange={e => handleFieldChange(f.field, e.target.value, f.type)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      rows={2}
                    />
                  ) : f.type === 'checkbox' && f.options ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {f.options.map(opt => (
                        <label key={opt} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(form[f.field] || []).includes(opt)}
                            onChange={() => handleFieldChange(f.field, opt, f.type, f.options)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={!!form[f.field]}
                        onChange={e => handleFieldChange(f.field, e.target.checked, f.type)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">{form[f.field] ? 'Sim' : 'Não'}</span>
                    </label>
                  ) : f.type === 'select' && f.options ? (
                    <select
                      value={form[f.field] || ''}
                      onChange={e => handleFieldChange(f.field, e.target.value, f.type)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione</option>
                      {f.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={form[f.field] || ''}
                      onChange={e => handleFieldChange(f.field, e.target.value, f.type)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-end p-4 border-b">
          <button
            onClick={() => { setShowForm(true); setEditItem(null); setForm(getEmptyForm(activeTab)); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum item no catálogo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {col.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {columns.map(col => (
                      <td key={col} className="px-6 py-4 text-sm text-gray-800">
                        {formatValue(item[col])}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 text-sm hover:underline mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}