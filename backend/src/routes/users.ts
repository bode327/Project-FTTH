import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

const ROLES = ['admin', 'projetista', 'tecnico', 'vendedor', 'viabilidade'];

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, 'SELECT id, tenant_id, name, email, role, created_at FROM users ORDER BY name', []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT id, tenant_id, name, email, role, created_at FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) { res.status(400).json({ error: 'name, email and password are required' }); return; }
    const userRole = ROLES.includes(role) ? role : 'tecnico';
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await queryWithRLS(req,
      'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, tenant_id, name, email, role, created_at',
      [req.user?.tenant_id, name, email, passwordHash, userRole]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') { res.status(409).json({ error: 'Email already exists' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { name, email, role, password } = req.body;
    if (role && !ROLES.includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      query = 'UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), role=COALESCE($3,role), password_hash=$4 WHERE id=$5 RETURNING id, tenant_id, name, email, role, created_at';
      params = [name, email, role, hash, req.params.id];
    } else {
      query = 'UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), role=COALESCE($3,role) WHERE id=$4 RETURNING id, tenant_id, name, email, role, created_at';
      params = [name, email, role, req.params.id];
    }
    const result = await queryWithRLS(req, query, params);
    if (result.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ message: 'User deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;