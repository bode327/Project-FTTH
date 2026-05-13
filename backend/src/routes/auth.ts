import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../db';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM tenants');
    const isSetup = parseInt(result.rows[0].count, 10) > 0;
    res.json({ isSetup });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/setup',
  [
    body('companyName').trim().isLength({ min: 2, max: 255 }).escape(),
    body('adminName').trim().isLength({ min: 2, max: 255 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { companyName, adminName, email, password } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const checkResult = await client.query('SELECT COUNT(*) FROM tenants');
      if (parseInt(checkResult.rows[0].count, 10) > 0) {
        res.status(400).json({ error: 'System already initialized' });
        return;
      }

      const tenantResult = await client.query(
        'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
        [companyName]
      );
      const tenantId = tenantResult.rows[0].id;

      const passwordHash = await bcrypt.hash(password, 12);
      const userResult = await client.query(
        'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tenantId, adminName, email, passwordHash, 'admin']
      );

      await client.query('COMMIT');

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured.');
      }

      const token = jwt.sign(
        { tenant_id: tenantId, user_id: userResult.rows[0].id, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({ message: 'Setup completed', token });
    } catch (error: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    const { email, password } = req.body;
    try {
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      if (userResult.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = userResult.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured.');
      }

      const token = jwt.sign(
        { tenant_id: user.tenant_id, user_id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({ token, role: user.role });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;