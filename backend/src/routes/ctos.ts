import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

const entityRoutes = (table: string, alias?: string) => {
  const name = alias || table;
  router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
      const { area_id } = req.query;
      let query = `SELECT id, tenant_id, area_id, name, address, capacity, status, ST_AsGeoJSON(geom) as geom, installed_splitters FROM ctos`;
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
      const result = await queryWithRLS(req, `SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: `${name} not found` }); return; }
      res.json({ data: result.rows[0] });
    } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
  });

  router.post('/', async (req: AuthenticatedRequest, res) => {
    try {
      const { name, address, lat, lng, capacity, status, area_id } = req.body;
      if (!name || name.trim().length < 2) { res.status(400).json({ error: 'Name is required' }); return; }
      let query, params;
      if (lat !== undefined && lng !== undefined) {
        query = `INSERT INTO ${table} (tenant_id, area_id, name, address, geom, capacity, status) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_Point($5, $6), 4326), $7, $8) RETURNING *`;
        params = [req.user?.tenant_id, area_id || null, name, address || null, lng, lat, capacity || 8, status || 'active'];
      } else {
        query = `INSERT INTO ${table} (tenant_id, area_id, name, address, capacity, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        params = [req.user?.tenant_id, area_id || null, name, address || null, capacity || 8, status || 'active'];
      }
      const result = await queryWithRLS(req, query, params);
      res.status(201).json({ data: result.rows[0] });
    } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
  });

  router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
    try {
      const allowed = ['name', 'address', 'capacity', 'status'];
      const updates = Object.keys(req.body).filter(k => allowed.includes(k));
      if (updates.length === 0) { res.status(400).json({ error: 'No valid fields to update' }); return; }
      const setClause = updates.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = updates.map(k => req.body[k]);
      const result = await queryWithRLS(req, `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
      if (result.rows.length === 0) { res.status(404).json({ error: `${name} not found` }); return; }
      res.json({ data: result.rows[0] });
    } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
  });

  router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
    try {
      const result = await queryWithRLS(req, `DELETE FROM ${table} WHERE id = $1 RETURNING id`, [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: `${name} not found` }); return; }
      res.json({ message: `${name} deleted` });
    } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
  });
};

entityRoutes('ctos');
export default router;