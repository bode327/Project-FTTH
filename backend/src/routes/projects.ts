import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT p.*, a.name as area_name, u.name as created_by_name
      FROM projects p
      LEFT JOIN areas a ON p.area_id = a.id
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, `
      SELECT p.*, a.name as area_name, u.name as created_by_name
      FROM projects p LEFT JOIN areas a ON p.area_id = a.id LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, area_id, status } = req.body;
    if (!name || name.trim().length < 2) { res.status(400).json({ error: 'Name is required' }); return; }
    const result = await queryWithRLS(req,
      'INSERT INTO projects (tenant_id, name, description, area_id, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user?.tenant_id, name, description || null, area_id || null, status || 'draft', req.user?.user_id]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { name, description, area_id, status } = req.body;
    const result = await queryWithRLS(req,
      'UPDATE projects SET name=COALESCE($1,name), description=COALESCE($2,description), area_id=COALESCE($3,area_id), status=COALESCE($4,status) WHERE id=$5 RETURNING *',
      [name, description, area_id, status, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM projects WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ message: 'Project deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;