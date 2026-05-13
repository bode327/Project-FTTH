import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT s.*, 
        st.name as tray_name,
        fa.tube_number || '/' || fa.fiber_number as fiber_a_pos,
        fb.tube_number || '/' || fb.fiber_number as fiber_b_pos
      FROM splices s
      LEFT JOIN splice_trays st ON s.tray_id = st.id
      LEFT JOIN fibers fa ON s.fiber_a_id = fa.id
      LEFT JOIN fibers fb ON s.fiber_b_id = fb.id
      ORDER BY s.performed_at DESC
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM splices WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Splice not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { tray_id, splice_type, fiber_a_id, fiber_b_id, tray_position, loss_db, performed_by, notes } = req.body;
    const query = `INSERT INTO splices (tenant_id, tray_id, splice_type, fiber_a_id, fiber_b_id, tray_position, loss_db, performed_by, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
    const params = [req.user?.tenant_id, tray_id || null, splice_type || 'fusion', fiber_a_id || null, fiber_b_id || null, tray_position || null, loss_db || null, performed_by || null, notes || null];
    const result = await queryWithRLS(req, query, params);
    if (fiber_a_id && fiber_b_id) {
      await queryWithRLS(req, `UPDATE fibers SET status = 'spliced' WHERE id IN ($1, $2)`, [fiber_a_id, fiber_b_id]);
    }
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { loss_db, performed_by, notes } = req.body;
    const result = await queryWithRLS(req, `UPDATE splices SET loss_db=COALESCE($1,loss_db), performed_by=COALESCE($2,performed_by), notes=COALESCE($3,notes) WHERE id=$4 RETURNING *`, [loss_db, performed_by, notes, req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Splice not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM splices WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Splice not found' }); return; }
    res.json({ message: 'Splice deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;