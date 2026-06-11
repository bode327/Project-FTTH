import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM map_legend ORDER BY name', []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('node_type').trim().isLength({ min: 1, max: 50 }),
  body('icon_id').optional().trim(),
  body('color').optional().trim(),
  body('description').optional().trim(),
], async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return; }
  try {
    const { name, node_type, icon_id, color, description } = req.body;
    const result = await queryWithRLS(req,
      'INSERT INTO map_legend (tenant_id, name, node_type, icon_id, color, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user?.tenant_id, name, node_type, icon_id || 'red-pushpin', color || '#ef4444', description || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { name, node_type, icon_id, color, description } = req.body;
    const result = await queryWithRLS(req,
      'UPDATE map_legend SET name=COALESCE($1,name), node_type=COALESCE($2,node_type), icon_id=COALESCE($3,icon_id), color=COALESCE($4,color), description=COALESCE($5,description), updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, node_type, icon_id, color, description, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Legend item not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM map_legend WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Legend item not found' }); return; }
    res.json({ message: 'Legend item deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;