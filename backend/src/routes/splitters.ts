import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT sp.*,
        c.name as cto_name,
        cs.ratio, cs.insertion_loss_db,
        fa.tube_number || '/' || fa.fiber_number as input_fiber
      FROM splitters sp
      LEFT JOIN ctos c ON sp.cto_id = c.id
      LEFT JOIN catalog_splitter cs ON sp.catalog_splitter_id = cs.id
      LEFT JOIN fibers fa ON sp.input_fiber_id = fa.id
      WHERE sp.tenant_id = $1
      ORDER BY sp.created_at DESC
    `, [req.user?.tenant_id]);
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Splitters GET error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM splitters WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Splitter not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { cto_id, catalog_splitter_id, tray_number, tray_position, input_fiber_id, parent_splitter_id } = req.body;
    if (!catalog_splitter_id) { res.status(400).json({ error: 'catalog_splitter_id is required' }); return; }
    const result = await queryWithRLS(req,
      'INSERT INTO splitters (tenant_id, cto_id, catalog_splitter_id, tray_number, tray_position, input_fiber_id, parent_splitter_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user?.tenant_id, cto_id || null, catalog_splitter_id, tray_number || 1, tray_position || null, input_fiber_id || null, parent_splitter_id || null]
    );
    if (input_fiber_id) {
      await queryWithRLS(req, `UPDATE fibers SET status = 'spliced' WHERE id = $1`, [input_fiber_id]);
    }
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM splitters WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Splitter not found' }); return; }
    res.json({ message: 'Splitter deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;