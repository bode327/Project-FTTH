import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT f.*, c.name as cable_name, c.measured_distance_km, c.calculated_distance_km
      FROM fibers f
      LEFT JOIN cables c ON f.cable_id = c.id
      ORDER BY f.cable_id, f.tube_number, f.fiber_number
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/free', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT f.*, c.name as cable_name
      FROM fibers f
      LEFT JOIN cables c ON f.cable_id = c.id
      WHERE f.status = 'free'
      ORDER BY f.cable_id, f.tube_number, f.fiber_number
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM fibers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Fiber not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id/status', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { status } = req.body;
    const validStatuses = ['free', 'reserved', 'in_use', 'spliced', 'broken', 'maintenance'];
    if (!validStatuses.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
    const result = await queryWithRLS(req, 'UPDATE fibers SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Fiber not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;