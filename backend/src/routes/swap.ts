import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/equipment', async (req: AuthenticatedRequest, res) => {
  try {
    const { type } = req.query;
    if (!type) { res.status(400).json({ error: 'type é obrigatório' }); return; }

    const queries: Record<string, string> = {
      pops: 'SELECT id, name, address FROM pops ORDER BY name',
      olt_chassis: 'SELECT oc.id, oc.name, oc.status, oc.management_ip, p.name as pop_name, com.model as model_name, com.brand as brand FROM olt_chassis oc LEFT JOIN pops p ON p.id = oc.pop_id LEFT JOIN catalog_olt_model com ON com.id = oc.catalog_olt_model_id WHERE oc.tenant_id = $1 ORDER BY oc.name',
      switches: 'SELECT s.id, s.name, s.status, s.management_ip, s.serial_number, p.name as pop_name, cs.model as model_name, cs.brand as brand FROM switches s LEFT JOIN pops p ON p.id = s.pop_id LEFT JOIN catalog_switch cs ON cs.id = s.catalog_switch_id WHERE s.tenant_id = $1 ORDER BY s.name',
      routers: 'SELECT r.id, r.name, r.status, r.management_ip, r.serial_number, p.name as pop_name, cr.model as model_name, cr.brand as brand FROM routers r LEFT JOIN pops p ON p.id = r.pop_id LEFT JOIN catalog_router cr ON cr.id = r.catalog_router_id WHERE r.tenant_id = $1 ORDER BY r.name',
      ctos: 'SELECT id, name, address, status, capacity FROM ctos ORDER BY name',
      ces: 'SELECT id, name, address, status, capacity FROM ces ORDER BY name',
      splitters: `SELECT s.id, s.tray_position, ct.name as cto_name, sp.ratio, sp.brand, sp.insertion_loss_db
        FROM splitters s JOIN ctos ct ON ct.id = s.cto_id JOIN catalog_splitter sp ON sp.id = s.catalog_splitter_id ORDER BY s.id`,
      gbics: `SELECT g.id, g.serial_number, gb.model as model_name, gb.brand, op.port_number, os.slot_number, olt.name as olt_name
        FROM gbics g JOIN catalog_gbic gb ON gb.id = g.catalog_gbic_id
        JOIN olt_ports op ON op.id = g.port_id JOIN olt_slots os ON os.id = op.slot_id JOIN olt_chassis olt ON olt.id = os.chassis_id ORDER BY g.serial_number`,
      clients: 'SELECT id, name, address, status, ont_serial, plan_mbps FROM clients ORDER BY name',
    };

    if (!queries[type as string]) { res.status(400).json({ error: 'Tipo inválido' }); return; }
    const needsTenant = ['olt_chassis', 'switches', 'routers'].includes(type as string);
    if (needsTenant && !req.user?.tenant_id) { res.status(401).json({ error: 'Não autorizado' }); return; }
    const result = await queryWithRLS(req, queries[type as string], needsTenant ? [req.user!.tenant_id] : undefined);
    res.json({ data: result.rows });
  } catch (error: any) { console.error('[/swap/equipment]', error.message); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/equipment/:type/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { type, id } = req.params;

    const tables: Record<string, { table: string; cols: string }> = {
      olt_chassis: { table: 'olt_chassis', cols: '*' },
      switches: { table: 'switches', cols: '*' },
      routers: { table: 'routers', cols: '*' },
      ctos: { table: 'ctos', cols: '*' },
      ces: { table: 'ces', cols: '*' },
      splitters: { table: 'splitters', cols: '*' },
      clients: { table: 'clients', cols: '*' },
    };

    const t = type as keyof typeof tables;
    if (!tables[t]) { res.status(400).json({ error: 'Tipo inválido' }); return; }
    const result = await queryWithRLS(req, `SELECT ${tables[t].cols} FROM ${tables[t].table} WHERE id = $1`, [id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Equipamento não encontrado' }); return; }

    let extra = {};
    if (type === 'splitters') {
      const [ports, splicesResult] = await Promise.all([
        queryWithRLS(req, 'SELECT f.id, f.tube_number, f.fiber_number, f.color, f.status FROM fibers f WHERE f.id IN (SELECT input_fiber_id FROM splitters WHERE id = $1 UNION ALL SELECT id FROM fibers WHERE id IN (SELECT fiber_a_id FROM splices WHERE fiber_b_id IN (SELECT id FROM fibers WHERE cable_id IN (SELECT cable_id FROM fibers WHERE id IN (SELECT input_fiber_id FROM splitters WHERE id = $1)))))', [id]),
        queryWithRLS(req, `SELECT s.*, f.tube_number, f.fiber_number, f.color, f.status as fiber_status, cab.name as cable_name
          FROM splices s JOIN fibers f ON f.id = s.fiber_a_id OR f.id = s.fiber_b_id
          JOIN cables cab ON cab.id = f.cable_id WHERE s.tray_id IN (SELECT id FROM splice_trays WHERE cto_id IN (SELECT cto_id FROM splitters WHERE id = $1))`, [id]),
      ]);
      extra = { connections: ports.rows, splices: splicesResult.rows };
    }

    if (type === 'olt_chassis') {
      const [slots, gbics] = await Promise.all([
        queryWithRLS(req, 'SELECT os.*, (SELECT COUNT(*) FROM olt_ports WHERE slot_id = os.id) as port_count FROM olt_slots os WHERE os.chassis_id = $1 ORDER BY os.slot_number', [id]),
        queryWithRLS(req, `SELECT g.id, g.serial_number, gb.model, gb.type, op.port_number, os.slot_number
          FROM gbics g JOIN catalog_gbic gb ON gb.id = g.catalog_gbic_id
          JOIN olt_ports op ON op.id = g.port_id JOIN olt_slots os ON os.id = op.slot_id WHERE os.chassis_id = $1`, [id]),
      ]);
      extra = { slots: slots.rows, gbics: gbics.rows };
    }

    if (type === 'switches') {
      const ports = await queryWithRLS(req, 'SELECT * FROM switch_ports WHERE switch_id = $1 ORDER BY port_number', [id]);
      extra = { ports: ports.rows };
    }

    if (type === 'routers') {
      const ifaces = await queryWithRLS(req, 'SELECT * FROM router_interfaces WHERE router_id = $1 ORDER BY interface_name', [id]);
      extra = { interfaces: ifaces.rows };
    }

    res.json({ data: { ...result.rows[0], ...extra } });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/swap', async (req: AuthenticatedRequest, res) => {
  try {
    const { equipment_type, old_id, new_id, reason, notes, port_mapping, reconnect_fibers } = req.body;
    if (!equipment_type || !old_id || !new_id) {
      res.status(400).json({ error: 'equipment_type, old_id e new_id são obrigatórios' }); return;
    }

    const tables: Record<string, { table: string; name_col: string }> = {
      olt_chassis: { table: 'olt_chassis', name_col: 'name' },
      switches: { table: 'switches', name_col: 'name' },
      routers: { table: 'routers', name_col: 'name' },
      ctos: { table: 'ctos', name_col: 'name' },
      ces: { table: 'ces', name_col: 'name' },
      splitters: { table: 'splitters', name_col: 'tray_position' },
      clients: { table: 'clients', name_col: 'name' },
      pops: { table: 'pops', name_col: 'name' },
    };

    if (!tables[equipment_type]) { res.status(400).json({ error: 'Tipo de equipamento inválido' }); return; }

    const client = await (await import('../db')).default.connect();
    try {
      await client.query('BEGIN');

      const oldEquip = await client.query(`SELECT * FROM ${tables[equipment_type].table} WHERE id = $1 AND tenant_id = $2`, [old_id, req.user?.tenant_id]);
      const newEquip = await client.query(`SELECT * FROM ${tables[equipment_type].table} WHERE id = $1 AND tenant_id = $2`, [new_id, req.user?.tenant_id]);

      if (oldEquip.rows.length === 0) { res.status(404).json({ error: 'Equipamento antigo não encontrado' }); return; }
      if (newEquip.rows.length === 0) { res.status(404).json({ error: 'Novo equipamento não encontrado' }); return; }

      await client.query(
        `UPDATE ${tables[equipment_type].table} SET status = $1 WHERE id = $2`,
        ['decommissioned', old_id]
      );

      const portMappings = port_mapping || [];
      const fiberReconnects = reconnect_fibers || [];
      const migrationResults = [];

      if (equipment_type === 'olt_chassis' && portMappings.length > 0) {
        for (const map of portMappings) {
          const { old_slot, old_port, new_slot, new_port, fiber_id, gbic_serial } = map;

          let newSlotId: string | null = null;
          let newPortId: string | null = null;

          if (new_slot && new_port) {
            let slot = await client.query('SELECT id FROM olt_slots WHERE chassis_id = $1 AND slot_number = $2', [new_id, new_slot]);
            if (slot.rows.length === 0) {
              const s = await client.query('INSERT INTO olt_slots (tenant_id, chassis_id, slot_number, slots_type) VALUES ($1,$2,$3,$4) RETURNING id', [req.user?.tenant_id, new_id, new_slot, 'PON']);
              newSlotId = s.rows[0].id;
            } else newSlotId = slot.rows[0].id;

            let port = await client.query('SELECT id FROM olt_ports WHERE slot_id = $1 AND port_number = $2', [newSlotId, new_port]);
            if (port.rows.length === 0) {
              const p = await client.query('INSERT INTO olt_ports (tenant_id, slot_id, port_number, port_type) VALUES ($1,$2,$3,$4) RETURNING id', [req.user?.tenant_id, newSlotId, new_port, 'PON']);
              newPortId = p.rows[0].id;
            } else newPortId = port.rows[0].id;

            if (gbic_serial && newPortId) {
              const gbicCatalog = await client.query('SELECT id FROM catalog_gbic WHERE model = (SELECT model FROM gbics WHERE serial_number = $1)', [gbic_serial]);
              if (gbicCatalog.rows.length > 0) {
                await client.query('UPDATE gbics SET port_id = $1 WHERE serial_number = $2', [newPortId, gbic_serial]);
              }
            }

            migrationResults.push({ old_slot, old_port, new_slot, new_port, fiber_id, gbic_serial, new_port_id: newPortId, status: 'migrated' });
          }
        }
      }

      if (equipment_type === 'switches' && portMappings.length > 0) {
        for (const map of portMappings) {
          const { old_port, new_port, vlan, lacp_group, connected_to, speed_mbps } = map;
          await client.query(
            'UPDATE switch_ports SET switch_id = $1, vlan = COALESCE($2, vlan), lacp_group = COALESCE($3, lacp_group), connected_to = COALESCE($4, connected_to), speed_mbps = COALESCE($5, speed_mbps) WHERE switch_id = $6 AND port_number = $7',
            [new_id, vlan, lacp_group, connected_to, speed_mbps, old_id, old_port]
          );
          migrationResults.push({ old_port, new_port, status: 'migrated' });
        }
      }

      if (equipment_type === 'splitters' && fiberReconnects.length > 0) {
        for (const rec of fiberReconnects) {
          const { old_fiber_id, new_fiber_id, tray_position } = rec;
          if (new_fiber_id) {
            await client.query('UPDATE splitters SET input_fiber_id = $1 WHERE id = $2', [new_fiber_id, new_id]);
            migrationResults.push({ old_fiber_id, new_fiber_id, tray_position, status: 'reconnected' });
          }
        }
      }

      if ((equipment_type === 'ctos' || equipment_type === 'ces') && reconnect_fibers) {
        for (const rec of reconnect_fibers) {
          const { old_fiber_id, new_fiber_id } = rec;
          if (new_fiber_id) {
            await client.query('UPDATE fibers SET status = $1 WHERE id = $2', ['reconnected', old_fiber_id]);
            migrationResults.push({ old_fiber_id, new_fiber_id, status: 'reconnected' });
          }
        }
      }

      await client.query(
        `INSERT INTO equipment_swap_history (tenant_id, equipment_type, old_id, new_id, reason, notes, migrated_by, port_mapping, reconnect_fibers)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.user?.tenant_id, equipment_type, old_id, new_id, reason || '', notes || '', req.user?.user_id,
         JSON.stringify(migrationResults), JSON.stringify(fiberReconnects)]
      );

      await client.query('COMMIT');
      res.json({
        message: `Substituição de ${tables[equipment_type].name_col} realizada com sucesso`,
        old_equipment: oldEquip.rows[0][tables[equipment_type].name_col] || oldEquip.rows[0].name,
        new_equipment: newEquip.rows[0][tables[equipment_type].name_col] || newEquip.rows[0].name,
        migrated_connections: migrationResults
      });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (error: any) { res.status(500).json({ error: 'Erro na substituição: ' + error.message }); }
});

router.get('/swap-history', async (req: AuthenticatedRequest, res) => {
  try {
    const { equipment_type } = req.query;
    let query = `SELECT h.*, u.name as migrated_by_name,
      (SELECT name FROM ${equipment_type || 'olt_chassis'} WHERE id = h.old_id) as old_name,
      (SELECT name FROM ${equipment_type || 'olt_chassis'} WHERE id = h.new_id) as new_name
      FROM equipment_swap_history h LEFT JOIN users u ON u.id = h.migrated_by WHERE h.tenant_id = $1`;
    const params: any[] = [req.user?.tenant_id];
    if (equipment_type) { query += ' AND h.equipment_type = $2'; params.push(equipment_type); }
    query += ' ORDER BY h.created_at DESC LIMIT 50';
    const result = await queryWithRLS(req, query, params);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/network-designs', async (req: AuthenticatedRequest, res) => {
  try {
    const { project_id } = req.query;
    let query = `SELECT nd.*, u.name as created_by_name FROM network_designs nd
      LEFT JOIN users u ON u.id = nd.created_by WHERE nd.tenant_id = $1`;
    const params: any[] = [req.user?.tenant_id];
    if (project_id) { query += ' AND nd.project_id = $2'; params.push(project_id); }
    query += ' ORDER BY nd.updated_at DESC';
    const result = await queryWithRLS(req, query, params);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/network-designs', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, project_id, canvas_data, viewport } = req.body;
    if (!name) { res.status(400).json({ error: 'name é obrigatório' }); return; }
    const result = await queryWithRLS(req,
      `INSERT INTO network_designs (tenant_id, project_id, name, description, canvas_data, viewport, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user?.tenant_id, project_id || null, name, description || '',
       JSON.stringify(canvas_data || {}), JSON.stringify(viewport || {}), req.user?.user_id]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/network-designs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, project_id, canvas_data, viewport, status } = req.body;
    const updates: string[] = []; const values: any[] = []; let idx = 1;
    const add = (k: string, v: any) => { updates.push(`${k} = $${idx}`); values.push(v); idx++; };
    if (name !== undefined) add('name', name);
    if (description !== undefined) add('description', description);
    if (project_id !== undefined) add('project_id', project_id);
    if (canvas_data !== undefined) add('canvas_data', JSON.stringify(canvas_data));
    if (viewport !== undefined) add('viewport', JSON.stringify(viewport));
    if (status !== undefined) add('status', status);
    add('updated_at', new Date());
    values.push(id);
    const result = await queryWithRLS(req,
      `UPDATE network_designs SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, values);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Design não encontrado' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/network-designs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, 'DELETE FROM network_designs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Design não encontrado' }); return; }
    res.json({ message: 'Design excluído' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/network-designs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req,
      `SELECT nd.*, u.name as created_by_name FROM network_designs nd LEFT JOIN users u ON u.id = nd.created_by WHERE nd.id = $1`,
      [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Design não encontrado' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
