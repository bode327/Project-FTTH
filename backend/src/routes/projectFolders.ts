import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM project_folders ORDER BY name');
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', [
  body('name').trim().isLength({ min: 1, max: 255 }),
], async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return; }
  try {
    const { name, parent_id } = req.body;
    const result = await queryWithRLS(req,
      'INSERT INTO project_folders (tenant_id, name, parent_id) VALUES ($1, $2, $3) RETURNING *',
      [req.user?.tenant_id, name, parent_id || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { name, parent_id } = req.body;
    const result = await queryWithRLS(req,
      'UPDATE project_folders SET name=COALESCE($1,name), parent_id=COALESCE($2,parent_id) WHERE id=$3 RETURNING *',
      [name, parent_id, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Folder not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM project_folders WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Folder not found' }); return; }
    res.json({ message: 'Folder deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;