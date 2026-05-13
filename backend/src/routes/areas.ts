import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT a.*, 
        (SELECT COUNT(*) FROM projects p WHERE p.area_id = a.id) as project_count
      FROM areas a ORDER BY a.name
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM areas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Area not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, lat, lng, radius_m } = req.body;
    if (!name || name.trim().length < 2) { res.status(400).json({ error: 'Name is required' }); return; }
    let geom = null;
    if (lat !== undefined && lng !== undefined && radius_m) {
      geom = `ST_Buffer(ST_SetSRID(ST_Point(${lng}, ${lat}), 4326), ${radius_m}, 'EPSG:4326')`;
    }
    const query = geom
      ? 'INSERT INTO areas (tenant_id, name, description, geom) VALUES ($1, $2, $3, ST_Buffer(ST_SetSRID(ST_Point($4, $5), 4326), $6, :param)) RETURNING *'
      : 'INSERT INTO areas (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING *';
    let params;
    if (geom) {
      params = [req.user?.tenant_id, name, description || null, lng, lat, radius_m];
    } else {
      params = [req.user?.tenant_id, name, description || null];
    }
    const result = await queryWithRLS(req, query, params);
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { name, description } = req.body;
    const result = await queryWithRLS(req,
      'UPDATE areas SET name=COALESCE($1,name), description=COALESCE($2,description) WHERE id=$3 RETURNING *',
      [name, description, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Area not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM areas WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Area not found' }); return; }
    res.json({ message: 'Area deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;