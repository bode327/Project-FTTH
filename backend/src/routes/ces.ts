import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { area_id } = req.query;
    let query = 'SELECT id, tenant_id, area_id, name, address, capacity, status, ST_AsGeoJSON(geom) as geom, icon_id FROM ces';
    const params: any[] = [];
    if (area_id) { query += ' WHERE area_id = $1'; params.push(area_id); }
    query += ' ORDER BY name';
    const result = await queryWithRLS(req, query, params);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM ces WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'CE not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, address, lat, lng, capacity, area_id } = req.body;
    if (!name || name.trim().length < 2) { res.status(400).json({ error: 'Name is required' }); return; }
    let query, params;
    if (lat !== undefined && lng !== undefined) {
      query = 'INSERT INTO ces (tenant_id, area_id, name, address, geom, capacity) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_Point($5, $6), 4326), $7) RETURNING *';
      params = [req.user?.tenant_id, area_id || null, name, address || null, lng, lat, capacity || 12];
    } else {
      query = 'INSERT INTO ces (tenant_id, area_id, name, address, capacity) VALUES ($1, $2, $3, $4, $5) RETURNING *';
      params = [req.user?.tenant_id, area_id || null, name, address || null, capacity || 12];
    }
    const result = await queryWithRLS(req, query, params);
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { name, address, capacity, status } = req.body;
    const result = await queryWithRLS(req,
      'UPDATE ces SET name=COALESCE($1,name), address=COALESCE($2,address), capacity=COALESCE($3,capacity), status=COALESCE($4,status) WHERE id=$5 RETURNING *',
      [name, address, capacity, status, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'CE not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM ces WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'CE not found' }); return; }
    res.json({ message: 'CE deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;