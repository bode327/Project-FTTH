import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res: any) => {
  try {
    const { area_id } = req.query;
    let query = 'SELECT id, tenant_id, area_id, name, address, ST_AsGeoJSON(geom) as geom FROM pops';
    const params: any[] = [];
    if (area_id) { query += ' WHERE area_id = $1'; params.push(area_id); }
    query += ' ORDER BY name';
    const result = await queryWithRLS(req, query, params);
    res.json({ data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM pops WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'POP not found' });
      return;
    }
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 255 }).escape(),
    body('address').optional().trim().escape(),
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  async (req: AuthenticatedRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }
    try {
      const { name, address, lat, lng, area_id } = req.body;
      let geom = null;
      if (lat && lng) {
        geom = `ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)`;
      }
      const query = geom
        ? 'INSERT INTO pops (tenant_id, area_id, name, address, geom) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_Point($5, $6), 4326)) RETURNING *'
        : 'INSERT INTO pops (tenant_id, area_id, name, address) VALUES ($1, $2, $3, $4) RETURNING *';
      const params = geom ? [req.user?.tenant_id, area_id || null, name, address, lng, lat] : [req.user?.tenant_id, area_id || null, name, address];
      const result = await queryWithRLS(req, query, params);
      res.status(201).json({ data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.put('/:id', param('id').isUUID(), body('name').optional().trim().isLength({ min: 2 }), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid data' });
    return;
  }
  try {
    const { name, address } = req.body;
    const result = await queryWithRLS(req, 'UPDATE pops SET name = COALESCE($1, name), address = COALESCE($2, address) WHERE id = $3 RETURNING *', [name, address, req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'POP not found' });
      return;
    }
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM pops WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'POP not found' });
      return;
    }
    res.json({ message: 'POP deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;