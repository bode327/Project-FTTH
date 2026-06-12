import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

const catalogTypes = [
  'olt-model', 'pon-card', 'gbic', 'ont', 'switch', 'router', 'dio',
  'splitter', 'dgo', 'rj', 'cable-type', 'duct', 'accessory', 'network-asset', 'fiber-color', 'service-card'
] as const;
type CatalogType = typeof catalogTypes[number];

router.get('/types', (req, res) => {
  res.json({ data: catalogTypes });
});

router.get('/:type', async (req: AuthenticatedRequest, res) => {
  const { type } = req.params;
  if (!catalogTypes.includes(type as CatalogType)) {
    res.status(400).json({ error: 'Tipo de catálogo inválido' }); return;
  }
  try {
    const queries: Record<string, string> = {
      'olt-model': 'SELECT * FROM catalog_olt_model ORDER BY brand, model',
      'pon-card': 'SELECT * FROM catalog_pon_card ORDER BY brand, model',
      'gbic': 'SELECT * FROM catalog_gbic ORDER BY brand, model',
      'ont': 'SELECT * FROM catalog_ont ORDER BY brand, model',
      'switch': 'SELECT * FROM catalog_switch ORDER BY brand, model',
      'router': 'SELECT * FROM catalog_router ORDER BY brand, model',
      'dio': 'SELECT * FROM catalog_dio ORDER BY brand, model',
      'splitter': 'SELECT * FROM catalog_splitter ORDER BY ratio',
      'dgo': 'SELECT * FROM catalog_dgo ORDER BY model',
      'rj': 'SELECT * FROM catalog_rj ORDER BY model',
      'cable-type': 'SELECT * FROM catalog_cable_type ORDER BY fiber_count',
      'duct': 'SELECT * FROM catalog_duct ORDER BY diameter_mm',
      'accessory': 'SELECT * FROM catalog_accessory ORDER BY category, name',
      'network-asset': 'SELECT * FROM catalog_network_asset ORDER BY category, name',
      'fiber-color': 'SELECT * FROM catalog_fiber_color ORDER BY sequence',
      'service-card': 'SELECT * FROM catalog_service_card ORDER BY category, brand, model',
    };
    const result = await queryWithRLS(req, queries[type as keyof typeof queries]);
    res.json({ data: result.rows });
  } catch (error: any) { 
    console.error('Catalog GET error:', error.message, error.code, error.detail);
    res.status(500).json({ error: 'Internal server error: ' + error.message }); 
  }
});

router.post('/:type', async (req: AuthenticatedRequest, res) => {
  const { type } = req.params;
  if (!catalogTypes.includes(type as CatalogType)) {
    res.status(400).json({ error: 'Tipo de catálogo inválido' }); return;
  }
  try {
    const b = req.body;
    const tid = req.user?.tenant_id;

    let fields: string[] = [];
    let values: any[] = [];
    let idx = 1;
    const add = (k: string, v: any) => { fields.push(k); values.push(v); };

    add('tenant_id', tid);

    switch (type) {
      case 'olt-model':
        if (!b.brand || !b.model) { res.status(400).json({ error: 'brand e model são obrigatórios' }); return; }
        add('brand', b.brand); add('model', b.model); add('total_slots', b.total_slots || 16);
        add('max_power_watts', b.max_power_watts); add('form_factor', b.form_factor || 'rack');
        add('description', b.description);
        break;
      case 'pon-card':
        if (!b.brand || !b.model || !b.pon_type) { res.status(400).json({ error: 'brand, model e pon_type são obrigatórios' }); return; }
        add('brand', b.brand); add('model', b.model); add('pon_type', b.pon_type);
        add('ports', b.ports || 16); add('tx_power_dbm', b.tx_power_dbm);
        add('rx_sensitivity_dbm', b.rx_sensitivity_dbm); add('budget_power_dbm', b.budget_power_dbm);
        add('max_split_ratio', b.max_split_ratio || 128); add('compatible_chassis', b.compatible_chassis);
        add('description', b.description);
        break;
      case 'gbic':
        if (!b.model) { res.status(400).json({ error: 'model é obrigatório' }); return; }
        add('model', b.model); add('type', b.type || 'SFP+');
        add('wavelength_range', b.wavelength_range || ['1310nm', '1490nm']);
        add('min_output_dbm', b.min_output_dbm); add('max_output_dbm', b.max_output_dbm);
        add('budget_power_dbm', b.budget_power_dbm); add('max_distance_km', b.max_distance_km);
        add('brand', b.brand); add('description', b.description);
        break;
      case 'ont':
        if (!b.brand || !b.model) { res.status(400).json({ error: 'brand e model são obrigatórios' }); return; }
        add('brand', b.brand); add('model', b.model);
        add('pon_compatibility', b.pon_compatibility || ['GPON']);
        add('ports_gigabit', b.ports_gigabit || 4); add('ports_voip', b.ports_voip || 0);
        add('ports_catv', b.ports_catv || 0); add('wifi_standard', b.wifi_standard);
        add('wifi_max_mbps', b.wifi_max_mbps); add('rx_power_min_dbm', b.rx_power_min_dbm);
        add('tx_power_dbm', b.tx_power_dbm); add('description', b.description);
        break;
      case 'switch':
        if (!b.brand || !b.model) { res.status(400).json({ error: 'brand e model são obrigatórios' }); return; }
        add('brand', b.brand); add('model', b.model); add('type', b.type || 'managed');
        add('layer', b.layer || 'L2'); add('ports', b.ports || 48); add('sfp_slots', b.sfp_slots || 4);
        add('poe_ports', b.poe_ports || 0); add('poe_budget_watts', b.poe_budget_watts);
        add('max_power_watts', b.max_power_watts); add('form_factor', b.form_factor || 'rack');
        add('description', b.description);
        break;
      case 'dio':
        if (!b.brand || !b.model || !b.total_ports) { res.status(400).json({ error: 'brand, model e total_ports são obrigatórios' }); return; }
        add('brand', b.brand); add('model', b.model); add('total_ports', b.total_ports);
        add('type', b.type || 'rack'); add('height_units', b.height_units || 1);
        add('splice_capacity', b.splice_capacity || 24); add('description', b.description);
        break;
      case 'router':
        if (!b.brand || !b.model) { res.status(400).json({ error: 'brand e model são obrigatórios' }); return; }
        add('brand', b.brand); add('model', b.model); add('type', b.type || 'fixed');
        add('slots', b.slots || 0); add('ethernet_ports', b.ethernet_ports || 0);
        add('sfp_ports', b.sfp_ports || 0); add('sfp28_ports', b.sfp28_ports || 0);
        add('qsfp_ports', b.qsfp_ports || 0); add('qsfp28_ports', b.qsfp28_ports || 0);
        add('throughput_mbps', b.throughput_mbps); add('vpn_support', b.vpn_support || false);
        add('firewall', b.firewall !== false); add('max_power_watts', b.max_power_watts);
        add('description', b.description);
        break;
      case 'service-card':
        if (!b.brand || !b.model || !b.category) { res.status(400).json({ error: 'brand, model e category são obrigatórios' }); return; }
        add('brand', b.brand); add('model', b.model); add('category', b.category);
        add('slots_type', b.slots_type || 'service'); add('ports', b.ports || 0);
        add('pon_type', b.pon_type); add('description', b.description);
        break;
      case 'splitter':
        if (!b.ratio || b.insertion_loss_db === undefined) { res.status(400).json({ error: 'ratio e insertion_loss_db são obrigatórios' }); return; }
        add('ratio', b.ratio); add('type', b.type || 'fused');
        add('insertion_loss_db', b.insertion_loss_db); add('brand', b.brand);
        add('description', b.description);
        break;
      case 'dgo':
        if (!b.model || !b.capacity_fibers) { res.status(400).json({ error: 'model e capacity_fibers são obrigatórios' }); return; }
        add('model', b.model); add('brand', b.brand);
        add('capacity_fibers', b.capacity_fibers); add('splice_trays', b.splice_trays || 1);
        add('max_splitters', b.max_splitters || 4); add('mounting', b.mounting || 'aereo');
        add('description', b.description);
        break;
      case 'rj':
        if (!b.model || !b.capacity_fibers) { res.status(400).json({ error: 'model e capacity_fibers são obrigatórios' }); return; }
        add('model', b.model); add('brand', b.brand); add('type', b.type || 'rj45');
        add('capacity_fibers', b.capacity_fibers); add('built_in_splitter', b.built_in_splitter);
        add('mounting', b.mounting || 'parede'); add('description', b.description);
        break;
      case 'cable-type':
        if (!b.name || !b.fiber_count) { res.status(400).json({ error: 'name e fiber_count são obrigatórios' }); return; }
        add('name', b.name); add('fiber_count', b.fiber_count); add('tube_count', b.tube_count);
        add('jacket_type', b.jacket_type); add('duct_compatible', b.duct_compatible !== false);
        add('color', b.color || '#3b82f6'); add('stroke_width', parseInt(b.stroke_width, 10) || 3);
        add('dashed', b.dashed !== undefined ? b.dashed : false);
        add('description', b.description);
        break;
      case 'duct':
        if (!b.name || !b.diameter_mm) { res.status(400).json({ error: 'name e diameter_mm são obrigatórios' }); return; }
        add('name', b.name); add('diameter_mm', b.diameter_mm); add('type', b.type || 'subterraneo');
        add('color', b.color); add('description', b.description);
        break;
      case 'accessory':
        if (!b.category || !b.name) { res.status(400).json({ error: 'category e name são obrigatórios' }); return; }
        add('category', b.category); add('name', b.name); add('brand', b.brand);
        add('unit', b.unit || 'un'); add('stock_quantity', b.stock_quantity || 0);
        add('min_stock', b.min_stock || 0); add('cost', b.cost);
        add('description', b.description);
        break;
      case 'network-asset':
        if (!b.category || !b.name) { res.status(400).json({ error: 'category e name são obrigatórios' }); return; }
        add('category', b.category); add('name', b.name); add('brand', b.brand);
        add('model', b.model); add('specifications', JSON.stringify(b.specifications || {}));
        add('unit', b.unit || 'un'); add('stock_quantity', b.stock_quantity || 0);
        add('min_stock', b.min_stock || 0); add('cost', b.cost);
        add('description', b.description);
        break;
      case 'fiber-color':
        if (!b.sequence || !b.color) { res.status(400).json({ error: 'sequence e color são obrigatórios' }); return; }
        add('sequence', b.sequence); add('color', b.color); add('name', b.name); add('color_code', b.color_code);
        break;
    }

    const tables: Record<string, string> = {
      'olt-model': 'catalog_olt_model', 'pon-card': 'catalog_pon_card', 'gbic': 'catalog_gbic',
      'ont': 'catalog_ont', 'switch': 'catalog_switch', 'router': 'catalog_router',
      'dio': 'catalog_dio', 'splitter': 'catalog_splitter', 'dgo': 'catalog_dgo', 'rj': 'catalog_rj',
      'cable-type': 'catalog_cable_type', 'duct': 'catalog_duct', 'accessory': 'catalog_accessory',
      'network-asset': 'catalog_network_asset',
      'fiber-color': 'catalog_fiber_color', 'service-card': 'catalog_service_card',
    };

    const result = await queryWithRLS(req,
      `INSERT INTO ${tables[type as keyof typeof tables]} (${fields.join(',')}) VALUES (${fields.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
      values
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') { res.status(409).json({ error: 'Já existe um item com esses dados' }); return; }
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

router.put('/:type/:id', async (req: AuthenticatedRequest, res) => {
  const { type, id } = req.params;
  if (!catalogTypes.includes(type as CatalogType)) {
    res.status(400).json({ error: 'Tipo de catálogo inválido' }); return;
  }
  try {
    const b = req.body;

    const intFields = ['total_slots', 'max_power_watts', 'ports', 'sfp_slots', 'poe_ports', 'poe_budget_watts', 'max_power_watts', 'slots', 'ethernet_ports', 'sfp_ports', 'sfp28_ports', 'qsfp_ports', 'qsfp28_ports', 'throughput_mbps', 'total_ports', 'height_units', 'splice_capacity', 'capacity_fibers', 'splice_trays', 'max_splitters', 'fiber_count', 'tube_count', 'diameter_mm', 'stock_quantity', 'min_stock', 'sequence'];
    const numFields = ['tx_power_dbm', 'rx_sensitivity_dbm', 'budget_power_dbm', 'min_output_dbm', 'max_output_dbm', 'max_distance_km', 'wifi_max_mbps', 'rx_power_min_dbm', 'tx_power_dbm', 'insertion_loss_db', 'cost'];
    
    for (const field of [...intFields, ...numFields]) {
      if (field in b) {
        if (b[field] === '' || b[field] === null) {
          b[field] = null;
        } else if (typeof b[field] === 'string') {
          if (intFields.includes(field)) {
            b[field] = parseInt(b[field], 10);
          } else {
            b[field] = parseFloat(b[field]);
          }
        }
      }
    }
    
    const boolFields = ['dashed', 'duct_compatible', 'vpn_support', 'firewall', 'built_in_splitter'];
    for (const field of boolFields) {
      if (field in b) {
        if (typeof b[field] === 'string') {
          b[field] = b[field] === 'true' || b[field] === '1' || b[field] === 'sim';
        } else if (Array.isArray(b[field])) {
          b[field] = b[field].length > 0;
        } else {
          b[field] = !!b[field];
        }
      }
    }

    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const addSet = (k: string, v: any) => { sets.push(`${k} = $${idx}`); values.push(v); idx++; };

    const fieldMap: Record<string, Record<string, string>> = {
      'olt-model': { brand: b.brand, model: b.model, total_slots: b.total_slots, max_power_watts: b.max_power_watts, form_factor: b.form_factor, description: b.description },
      'pon-card': { brand: b.brand, model: b.model, pon_type: b.pon_type, ports: b.ports, tx_power_dbm: b.tx_power_dbm, rx_sensitivity_dbm: b.rx_sensitivity_dbm, budget_power_dbm: b.budget_power_dbm, max_split_ratio: b.max_split_ratio, compatible_chassis: b.compatible_chassis, description: b.description },
      'gbic': { model: b.model, type: b.type, wavelength_range: b.wavelength_range, min_output_dbm: b.min_output_dbm, max_output_dbm: b.max_output_dbm, budget_power_dbm: b.budget_power_dbm, max_distance_km: b.max_distance_km, brand: b.brand, description: b.description },
      'ont': { brand: b.brand, model: b.model, pon_compatibility: b.pon_compatibility, ports_gigabit: b.ports_gigabit, ports_voip: b.ports_voip, ports_catv: b.ports_catv, wifi_standard: b.wifi_standard, wifi_max_mbps: b.wifi_max_mbps, rx_power_min_dbm: b.rx_power_min_dbm, tx_power_dbm: b.tx_power_dbm, description: b.description },
      'switch': { brand: b.brand, model: b.model, type: b.type, layer: b.layer, ports: b.ports, sfp_slots: b.sfp_slots, poe_ports: b.poe_ports, poe_budget_watts: b.poe_budget_watts, max_power_watts: b.max_power_watts, form_factor: b.form_factor, description: b.description },
      'router': { brand: b.brand, model: b.model, type: b.type, slots: b.slots, ethernet_ports: b.ethernet_ports, sfp_ports: b.sfp_ports, sfp28_ports: b.sfp28_ports, qsfp_ports: b.qsfp_ports, qsfp28_ports: b.qsfp28_ports, throughput_mbps: b.throughput_mbps, vpn_support: b.vpn_support, firewall: b.firewall, max_power_watts: b.max_power_watts, description: b.description },
      'service-card': { brand: b.brand, model: b.model, category: b.category, slots_type: b.slots_type, ports: b.ports, pon_type: b.pon_type, description: b.description },
      'splitter': { ratio: b.ratio, type: b.type, insertion_loss_db: b.insertion_loss_db, brand: b.brand, description: b.description },
      'dgo': { model: b.model, brand: b.brand, capacity_fibers: b.capacity_fibers, splice_trays: b.splice_trays, max_splitters: b.max_splitters, mounting: b.mounting, description: b.description },
      'rj': { model: b.model, brand: b.brand, type: b.type, capacity_fibers: b.capacity_fibers, built_in_splitter: b.built_in_splitter, mounting: b.mounting, description: b.description },
      'cable-type': { name: b.name, fiber_count: b.fiber_count, tube_count: b.tube_count, jacket_type: b.jacket_type, duct_compatible: b.duct_compatible, color: b.color, stroke_width: b.stroke_width, dashed: b.dashed, description: b.description },
      'duct': { name: b.name, diameter_mm: b.diameter_mm, type: b.type, color: b.color, description: b.description },
      'dio': { brand: b.brand, model: b.model, total_ports: b.total_ports, type: b.type, height_units: b.height_units, splice_capacity: b.splice_capacity, description: b.description },
      'accessory': { category: b.category, name: b.name, brand: b.brand, unit: b.unit, stock_quantity: b.stock_quantity, min_stock: b.min_stock, cost: b.cost, description: b.description },
      'network-asset': { category: b.category, name: b.name, brand: b.brand, model: b.model, specifications: b.specifications, unit: b.unit, stock_quantity: b.stock_quantity, min_stock: b.min_stock, cost: b.cost, description: b.description },
      'fiber-color': { sequence: b.sequence, color: b.color, name: b.name, color_code: b.color_code },
    };

    const fields = fieldMap[type as keyof typeof fieldMap] || {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) addSet(k, v);
    }

    if (sets.length === 0) { res.status(400).json({ error: 'Nenhum campo para atualizar' }); return; }
    values.push(id);

    const tables: Record<string, string> = {
      'olt-model': 'catalog_olt_model', 'pon-card': 'catalog_pon_card', 'gbic': 'catalog_gbic',
      'ont': 'catalog_ont', 'switch': 'catalog_switch', 'router': 'catalog_router',
      'dio': 'catalog_dio', 'splitter': 'catalog_splitter', 'dgo': 'catalog_dgo', 'rj': 'catalog_rj',
      'cable-type': 'catalog_cable_type', 'duct': 'catalog_duct', 'accessory': 'catalog_accessory',
      'network-asset': 'catalog_network_asset',
      'service-card': 'catalog_service_card', 'fiber-color': 'catalog_fiber_color',
    };

    const result = await queryWithRLS(req,
      `UPDATE ${tables[type as keyof typeof tables]} SET ${sets.join(',')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Item não encontrado' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Catalog PUT error:', error.message, error.code, error.detail);
    if (error.code === '23505') { res.status(409).json({ error: 'Já existe um item com esses dados' }); return; }
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

router.delete('/:type/:id', async (req: AuthenticatedRequest, res) => {
  const { type, id } = req.params;
  if (!catalogTypes.includes(type as CatalogType)) {
    res.status(400).json({ error: 'Tipo de catálogo inválido' }); return;
  }
  try {
    const tables: Record<string, string> = {
      'olt-model': 'catalog_olt_model', 'pon-card': 'catalog_pon_card', 'gbic': 'catalog_gbic',
      'ont': 'catalog_ont', 'switch': 'catalog_switch', 'router': 'catalog_router',
      'dio': 'catalog_dio', 'splitter': 'catalog_splitter', 'dgo': 'catalog_dgo', 'rj': 'catalog_rj',
      'cable-type': 'catalog_cable_type', 'duct': 'catalog_duct', 'accessory': 'catalog_accessory',
      'network-asset': 'catalog_network_asset',
      'fiber-color': 'catalog_fiber_color', 'service-card': 'catalog_service_card',
    };
    const result = await queryWithRLS(req, `DELETE FROM ${tables[type as keyof typeof tables]} WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Item não encontrado' }); return; }
    res.json({ message: 'Item excluído' });
  } catch (error: any) {
    if (error.code === '23505') { res.status(409).json({ error: 'Não é possível excluir: item em uso' }); return; }
    console.error('Catalog DELETE error:', error.message, error.code, error.detail);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
