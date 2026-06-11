import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { area_id } = req.query;
    let query = `
      SELECT c.id, c.tenant_id, c.area_id, c.node_a_id, c.node_b_id,
        COALESCE(c.calculated_distance_km, c.measured_distance_km) as calculated_distance_km,
        c.measured_distance_km, c.created_at, c.status,
        c.cable_type_id,
        ST_AsGeoJSON(c.geom) as geom,
        na.name as node_a_name, nb.name as node_b_name,
        cct.name as cable_type_name, cct.color as cable_color, cct.stroke_width as cable_width, cct.dashed as cable_dashed
      FROM cables c
      LEFT JOIN network_nodes na ON c.node_a_id = na.id
      LEFT JOIN network_nodes nb ON c.node_b_id = nb.id
      LEFT JOIN catalog_cable_type cct ON c.cable_type_id = cct.id`;
    const params: any[] = [];
    if (area_id) { query += ' WHERE c.area_id = $1'; params.push(area_id); }
    query += ' ORDER BY c.id';
    const result = await queryWithRLS(req, query, params);
    res.json({ data: result.rows });
  } catch (error: any) { console.error('Cables GET error:', error.message); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM cables WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Cable not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id/fibers', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM fibers WHERE cable_id = $1 ORDER BY tube_number, fiber_number', [req.params.id]);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, node_a_id, node_b_id, cable_type_id, calculated_distance_km, measured_distance_km, lat, lng, area_id } = req.body;
    if (!name || name.trim().length < 2) { res.status(400).json({ error: 'Name is required' }); return; }
    let cableAreaId = area_id || null;
    if (!cableAreaId && node_a_id) {
      const nodeA = await queryWithRLS(req, 'SELECT area_id FROM network_nodes WHERE id = $1', [node_a_id]);
      if (nodeA.rows.length > 0 && nodeA.rows[0].area_id) cableAreaId = nodeA.rows[0].area_id;
    }
    if (lat !== undefined && lng !== undefined) {
      const result = await queryWithRLS(req,
        `INSERT INTO cables (tenant_id, area_id, name, node_a_id, node_b_id, cable_type_id, calculated_distance_km, measured_distance_km, geom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_Point($9, $10), 4326)) RETURNING *`,
        [req.user?.tenant_id, cableAreaId, name, node_a_id || null, node_b_id || null, cable_type_id || null, calculated_distance_km || null, measured_distance_km || null, lng, lat]
      );
      res.status(201).json({ data: result.rows[0] });
    } else {
      const result = await queryWithRLS(req,
        `INSERT INTO cables (tenant_id, area_id, name, node_a_id, node_b_id, cable_type_id, calculated_distance_km, measured_distance_km) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user?.tenant_id, cableAreaId, name, node_a_id || null, node_b_id || null, cable_type_id || null, calculated_distance_km || null, measured_distance_km || null]
      );
      res.status(201).json({ data: result.rows[0] });
    }
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const allowed = ['name', 'calculated_distance_km', 'measured_distance_km', 'status', 'installation_date'];
    const updates = Object.keys(req.body).filter(k => allowed.includes(k));
    if (updates.length === 0) { res.status(400).json({ error: 'No valid fields to update' }); return; }
    const setClause = updates.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = updates.map(k => req.body[k]);
    const result = await queryWithRLS(req, `UPDATE cables SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Cable not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM cables WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Cable not found' }); return; }
    res.json({ message: 'Cable deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;