import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT cl.id, cl.tenant_id, cl.name, cl.address, cl.status, cl.phone, cl.plan_mbps, cl.ont_serial, cl.vlan,
        ST_AsGeoJSON(cl.geom) as geom,
        c.name as cto_name, f.tube_number || '/' || f.fiber_number as fiber_pos, s.id as splitter_id
      FROM clients cl
      LEFT JOIN ctos c ON cl.cto_id = c.id
      LEFT JOIN fibers f ON cl.fiber_id = f.id
      LEFT JOIN splitters s ON cl.splitter_id = s.id
      ORDER BY cl.name
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, cto_id, address, phone, plan_mbps, fiber_id, splitter_id, ont_serial, vlan, status } = req.body;
    if (!name || name.trim().length < 2) { res.status(400).json({ error: 'Name is required' }); return; }
    const query = `INSERT INTO clients (tenant_id, name, cto_id, address, phone, plan_mbps, fiber_id, splitter_id, ont_serial, vlan, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
    const params = [req.user?.tenant_id, name, cto_id || null, address || null, phone || null, plan_mbps || null, fiber_id || null, splitter_id || null, ont_serial || null, vlan || null, status || 'active'];
    const result = await queryWithRLS(req, query, params);
    if (fiber_id) { await queryWithRLS(req, `UPDATE fibers SET status = 'in_use' WHERE id = $1`, [fiber_id]); }
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const allowed = ['name', 'cto_id', 'address', 'phone', 'plan_mbps', 'status', 'ont_serial', 'vlan'];
    const updates = Object.keys(req.body).filter(k => allowed.includes(k));
    if (updates.length === 0) { res.status(400).json({ error: 'No valid fields to update' }); return; }
    const setClause = updates.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = updates.map(k => req.body[k]);
    const result = await queryWithRLS(req, `UPDATE clients SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json({ message: 'Client deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;