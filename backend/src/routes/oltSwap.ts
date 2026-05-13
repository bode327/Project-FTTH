import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.post('/swap', async (req: AuthenticatedRequest, res) => {
  try {
    const { old_olt_id, new_olt_id, port_mapping } = req.body;
    if (!old_olt_id || !new_olt_id) {
      res.status(400).json({ error: 'old_olt_id e new_olt_id são obrigatórios' });
      return;
    }

    const client = await (await import('../db')).default.connect();
    try {
      await client.query('BEGIN');

      const oldChassis = await client.query('SELECT * FROM olt_chassis WHERE id = $1 AND tenant_id = $2', [old_olt_id, req.user?.tenant_id]);
      const newChassis = await client.query('SELECT * FROM olt_chassis WHERE id = $1 AND tenant_id = $2', [new_olt_id, req.user?.tenant_id]);

      if (oldChassis.rows.length === 0) { res.status(404).json({ error: 'OLT antigo não encontrado' }); return; }
      if (newChassis.rows.length === 0) { res.status(404).json({ error: 'Nova OLT não encontrada' }); return; }

      await client.query(
        'UPDATE olt_chassis SET status = $1, updated_at = NOW() WHERE id = $2',
        ['decommissioned', old_olt_id]
      );

      const mapping = port_mapping || [];
      const results = [];

      for (const map of mapping) {
        const { old_slot, old_port, new_slot, new_port, fiber_id } = map;

        if (old_slot && old_port && new_slot && new_port) {
          const oldSlotResult = await client.query(
            'SELECT id FROM olt_slots WHERE chassis_id = $1 AND slot_number = $2',
            [old_olt_id, old_slot]
          );
          const oldPortResult = await client.query(
            'SELECT id FROM olt_ports WHERE slot_id = $1 AND port_number = $2',
            [oldSlotResult.rows[0]?.id, old_port]
          );

          let newSlotResult = await client.query(
            'SELECT id FROM olt_slots WHERE chassis_id = $1 AND slot_number = $2',
            [new_olt_id, new_slot]
          );
          if (newSlotResult.rows.length === 0) {
            newSlotResult = await client.query(
              'INSERT INTO olt_slots (tenant_id, chassis_id, slot_number, slots_type) VALUES ($1, $2, $3, $4) RETURNING id',
              [req.user?.tenant_id, new_olt_id, new_slot, 'PON']
            );
          }

          let newPortResult = await client.query(
            'SELECT id FROM olt_ports WHERE slot_id = $1 AND port_number = $2',
            [newSlotResult.rows[0].id, new_port]
          );
          if (newPortResult.rows.length === 0) {
            newPortResult = await client.query(
              'INSERT INTO olt_ports (tenant_id, slot_id, port_number, port_type) VALUES ($1, $2, $3, $4) RETURNING id',
              [req.user?.tenant_id, newSlotResult.rows[0].id, new_port, 'PON']
            );
          }

          if (fiber_id) {
            await client.query(
              'UPDATE fibers SET status = $1 WHERE id = $2',
              ['migrated', fiber_id]
            );
          }

          results.push({
            old_slot, old_port, new_slot, new_port, fiber_id,
            new_port_id: newPortResult.rows[0].id,
            status: 'migrated'
          });
        }
      }

      await client.query('COMMIT');
      res.json({
        message: 'Swap de OLT realizado com sucesso',
        old_olt: oldChassis.rows[0].name,
        new_olt: newChassis.rows[0].name,
        migrated_ports: results
      });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (error: any) { res.status(500).json({ error: 'Internal server error: ' + error.message }); }
});

router.get('/designs', async (req: AuthenticatedRequest, res) => {
  try {
    const { project_id } = req.query;
    let query = 'SELECT nd.*, u.name as created_by_name FROM network_designs nd LEFT JOIN users u ON u.id = nd.created_by WHERE nd.tenant_id = $1';
    const params: any[] = [req.user?.tenant_id];
    if (project_id) { query += ' AND nd.project_id = $2'; params.push(project_id); }
    query += ' ORDER BY nd.updated_at DESC';
    const result = await queryWithRLS(req, query, params);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/designs', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, project_id, canvas_data, viewport } = req.body;
    if (!name) { res.status(400).json({ error: 'name é obrigatório' }); return; }
    const result = await queryWithRLS(req,
      'INSERT INTO network_designs (tenant_id, project_id, name, description, canvas_data, viewport, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user?.tenant_id, project_id || null, name, description || '', JSON.stringify(canvas_data || {}), JSON.stringify(viewport || {}), req.user?.user_id]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/designs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, project_id, canvas_data, viewport, status } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (name !== undefined) { updates.push(`name = $${idx}`); values.push(name); idx++; }
    if (description !== undefined) { updates.push(`description = $${idx}`); values.push(description); idx++; }
    if (project_id !== undefined) { updates.push(`project_id = $${idx}`); values.push(project_id); idx++; }
    if (canvas_data !== undefined) { updates.push(`canvas_data = $${idx}`); values.push(JSON.stringify(canvas_data)); idx++; }
    if (viewport !== undefined) { updates.push(`viewport = $${idx}`); values.push(JSON.stringify(viewport)); idx++; }
    if (status !== undefined) { updates.push(`status = $${idx}`); values.push(status); idx++; }
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await queryWithRLS(req,
      `UPDATE network_designs SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Design não encontrado' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/designs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, 'DELETE FROM network_designs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Design não encontrado' }); return; }
    res.json({ message: 'Design excluído' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/designs/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, 'SELECT nd.*, u.name as created_by_name FROM network_designs nd LEFT JOIN users u ON u.id = nd.created_by WHERE nd.id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Design não encontrado' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
