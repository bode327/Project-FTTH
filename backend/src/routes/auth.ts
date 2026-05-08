import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM tenants');
    const isSetup = parseInt(result.rows[0].count, 10) > 0;
    res.json({ isSetup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/setup', async (req, res) => {
  const { companyName, adminName, email, password } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if already setup
    const checkResult = await client.query('SELECT COUNT(*) FROM tenants');
    if (parseInt(checkResult.rows[0].count, 10) > 0) {
       res.status(400).json({ error: 'System already initialized' });
       return;
    }

    // Create tenant
    const tenantResult = await client.query(
      'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
      [companyName]
    );
    const tenantId = tenantResult.rows[0].id;

    // Create super admin
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [tenantId, adminName, email, passwordHash, 'admin']
    );

    await client.query('COMMIT');

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured.');
    }

    const token = jwt.sign(
      { tenant_id: tenantId, user_id: userResult.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ message: 'Setup completed', token });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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
      { tenant_id: user.tenant_id, user_id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: user.role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
