import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res: any) => {
  try {
    const { area_id } = req.query;
    let query = 'SELECT id, tenant_id, area_id, name, address, ST_AsGeoJSON(geom) as geom, icon_id, icon_color FROM pops';
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
      const { name, address, lat, lng, area_id, icon_id, legend_id, icon_color } = req.body;
      if (lat !== undefined && lng !== undefined) {
        const result = await queryWithRLS(req,
          'INSERT INTO pops (tenant_id, area_id, name, address, geom, icon_id, legend_id, icon_color) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_Point($5, $6), 4326), $7, $8, $9) RETURNING *',
          [req.user?.tenant_id, area_id || null, name, address || null, lng, lat, icon_id || null, legend_id || null, icon_color || null]
        );
        res.status(201).json({ data: result.rows[0] });
      } else {
        const result = await queryWithRLS(req,
          'INSERT INTO pops (tenant_id, area_id, name, address, icon_id, legend_id, icon_color) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [req.user?.tenant_id, area_id || null, name, address || null, icon_id || null, legend_id || null, icon_color || null]
        );
        res.status(201).json({ data: result.rows[0] });
      }
    } catch (error: any) { console.error('POP POST error:', error); res.status(500).json({ error: 'Internal server error: ' + error.message }); }
  }
);

router.put('/:id', param('id').isUUID(), body('name').optional().trim().isLength({ min: 2 }), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid data' });
    return;
  }
  try {
    const { name, address, icon_id, legend_id, icon_color } = req.body;
    const result = await queryWithRLS(req, 'UPDATE pops SET name = COALESCE($1, name), address = COALESCE($2, address), icon_id = COALESCE($3, icon_id), legend_id = COALESCE($4, legend_id), icon_color = COALESCE($5, icon_color) WHERE id = $6 RETURNING *', [name, address, icon_id, legend_id, icon_color, req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'POP not found' });
      return;
    }
    res.json({ data: result.rows[0] });
  } catch (error: any) { console.error('POP PUT error:', error); res.status(500).json({ error: 'Internal server error: ' + error.message }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }
  try {
    const check = await queryWithRLS(req, 'SELECT id FROM olt_chassis WHERE pop_id = $1 LIMIT 1', [req.params.id]);
    if (check.rows.length > 0) {
      res.status(409).json({ error: 'Não é possível excluir: este POP possui chassis OLT vinculados.' });
      return;
    }
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