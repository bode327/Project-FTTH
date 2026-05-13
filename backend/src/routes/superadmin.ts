import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(requireSuperAdmin);

router.get('/tenants', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.name as empresa, t.domain as dominio, t.plan as plano, t.status,
        t.domain, t.plan, t.status, t.blocked_reason, t.blocked_at,
        t.billing_cycle, t.next_billing_date,
        t.max_pops, t.max_olts, t.max_ctos, t.max_ces, t.max_clients, t.max_cables, t.max_fibers,
        t.features, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM pops WHERE tenant_id = t.id) as pops_count,
        (SELECT COUNT(*) FROM olt_chassis WHERE tenant_id = t.id) as olts_count,
        (SELECT COUNT(*) FROM ctos WHERE tenant_id = t.id) as ctos_count,
        (SELECT COUNT(*) FROM ces WHERE tenant_id = t.id) as ces_count,
        (SELECT COUNT(*) FROM clients WHERE tenant_id = t.id) as clientes_count,
        (SELECT COUNT(*) FROM cables WHERE tenant_id = t.id) as cabos_count,
        (SELECT COALESCE(SUM(calculated_distance_km),0) FROM cables WHERE tenant_id = t.id) as cabo_km,
        (SELECT COUNT(*) FROM fibers WHERE tenant_id = t.id) as fibers_count,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as usuarios_count,
        (SELECT MAX(created_at) FROM clients WHERE tenant_id = t.id) as last_activity,
        (SELECT u.email FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.created_at LIMIT 1) as admin_email,
        (SELECT u.name FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.created_at LIMIT 1) as admin_name
      FROM tenants t
      ORDER BY t.created_at DESC
    `);
    res.json({ data: result.rows });
  } catch (error: any) { 
    console.error('Superadmin tenants error:', error);
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

router.post('/tenants', async (req: AuthenticatedRequest, res) => {
  try {
    const { nome_empresa, dominio, admin_email, admin_name, password, plano, max_pops, max_olts, max_ctos, max_ces, max_clients, max_cables, max_fibers, features } = req.body;
    const name = nome_empresa;
    const domain = dominio;
    const email = admin_email;
    const adminName = admin_name;
    const plan = plano;
    const maxPops = max_pops;
    const maxOlts = max_olts;
    const maxCtos = max_ctos;
    const maxCes = max_ces;
    const maxClients = max_clients;
    const maxCables = max_cables;
    const maxFibers = max_fibers;

    if (!name || !email || !password || !adminName) {
      res.status(400).json({ error: 'nome_empresa, admin_email, password, admin_name são obrigatórios' }); return;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tenantResult = await client.query(
        `INSERT INTO tenants (name, domain, plan, max_pops, max_olts, max_ctos, max_ces, max_clients, max_cables, max_fibers, features, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'trial') RETURNING *`,
        [name, domain || null, plan || 'trial', maxPops || 2, maxOlts || 2, maxCtos || 50, maxCes || 100, maxClients || 500, maxCables || 100, maxFibers || 5000, features ? JSON.stringify(features) : null]
      );
      const tenantId = tenantResult.rows[0].id;
      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(
        'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)',
        [tenantId, adminName, email, passwordHash, 'admin']
      );
      await client.query('COMMIT');
      res.status(201).json({ data: tenantResult.rows[0], message: 'Empresa criada com sucesso' });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (error: any) { 
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

router.put('/tenants/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { empresa, dominio, plano, status, blocked_reason, max_pops, max_olts, max_ctos, max_ces, max_clients, max_cables, max_fibers, features, billing_cycle, next_billing_date } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const add = (k: string, v: any) => { updates.push(`${k} = $${idx}`); values.push(v); idx++; };

    if (empresa !== undefined) add('name', empresa);
    if (dominio !== undefined) add('domain', dominio);
    if (plano !== undefined) add('plan', plano);
    if (status !== undefined) {
      add('status', status);
      if (status === 'blocked' || status === 'suspended') add('blocked_at', new Date());
    }
    if (blocked_reason !== undefined) add('blocked_reason', blocked_reason);
    if (max_pops !== undefined) add('max_pops', max_pops);
    if (max_olts !== undefined) add('max_olts', max_olts);
    if (max_ctos !== undefined) add('max_ctos', max_ctos);
    if (max_ces !== undefined) add('max_ces', max_ces);
    if (max_clients !== undefined) add('max_clients', max_clients);
    if (max_cables !== undefined) add('max_cables', max_cables);
    if (max_fibers !== undefined) add('max_fibers', max_fibers);
    if (features !== undefined) add('features', JSON.stringify(features));
    if (billing_cycle !== undefined) add('billing_cycle', billing_cycle);
    if (next_billing_date !== undefined) add('next_billing_date', next_billing_date);
    add('updated_at', new Date());
    values.push(id);

    const result = await pool.query(
      `UPDATE tenants SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Empresa não encontrada' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { 
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

router.delete('/tenants/:id', async (req: AuthenticatedRequest, res) => {
  try {
    await pool.query('UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2', ['cancelled', req.params.id]);
    res.json({ message: 'Empresa cancelada (soft delete)' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/tenants/:id/reset-password', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 8) { res.status(400).json({ error: 'Senha mínimo 8 caracteres' }); return; }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE tenant_id = $2 AND role = $3 RETURNING id',
      [hash, id, 'admin']
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Admin não encontrado' }); return; }
    res.json({ message: 'Senha do admin redefinida' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const [tenants, totalClients, totalCtos, totalPops, totalCables, totalCtoKm] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $1) as active, COUNT(*) FILTER (WHERE status = $2) as blocked, COUNT(*) FILTER (WHERE status = $3) as suspended FROM tenants', ['active', 'blocked', 'suspended']),
      pool.query('SELECT COUNT(*) as total FROM clients'),
      pool.query('SELECT COUNT(*) as total FROM ctos'),
      pool.query('SELECT COUNT(*) as total FROM pops'),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(calculated_distance_km),0) as total_km FROM cables'),
      pool.query('SELECT COUNT(*) FILTER (WHERE capacity <= 8) as micro, COUNT(*) FILTER (WHERE capacity > 8 AND capacity <= 16) as medio, COUNT(*) FILTER (WHERE capacity > 16) as grande FROM ctos'),
    ]);
    const clientsByPlan = await pool.query(`SELECT plan_mbps, COUNT(*) as total FROM clients WHERE plan_mbps IS NOT NULL GROUP BY plan_mbps ORDER BY plan_mbps`);
    const clientsByStatus = await pool.query(`SELECT status, COUNT(*) as total FROM clients GROUP BY status`);
    const ctoCapacity = await pool.query(`SELECT SUM(capacity) as total_capacity, SUM(installed_splitters) as total_splitters FROM ctos`);
    res.json({
      data: {
        tenants: { total: parseInt(tenants.rows[0].total), active: parseInt(tenants.rows[0].active), blocked: parseInt(tenants.rows[0].blocked), suspended: parseInt(tenants.rows[0].suspended) },
        clients: { total: parseInt(totalClients.rows[0].total) },
        ctos: { total: parseInt(totalCtos.rows[0].total), micro: parseInt(ctoCapacity.rows[0].micro || 0), medio: parseInt(ctoCapacity.rows[0].medio || 0), grande: parseInt(ctoCapacity.rows[0].grande || 0), total_capacity: parseInt(ctoCapacity.rows[0].total_capacity || 0), total_splitters: parseInt(ctoCapacity.rows[0].total_splitters || 0) },
        pops: { total: parseInt(totalPops.rows[0].total) },
        cables: { total: parseInt(totalCables.rows[0].total), total_km: parseFloat(totalCables.rows[0].total_km) },
        clientsByPlan: clientsByPlan.rows,
        clientsByStatus: clientsByStatus.rows,
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/tenants/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.name as empresa, t.domain as dominio, t.plan as plano, t.status,
        t.domain, t.plan, t.status, t.blocked_reason, t.blocked_at,
        t.billing_cycle, t.next_billing_date,
        t.max_pops, t.max_olts, t.max_ctos, t.max_ces, t.max_clients, t.max_cables, t.max_fibers,
        t.features, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM pops WHERE tenant_id = t.id) as pops_count,
        (SELECT COUNT(*) FROM olt_chassis WHERE tenant_id = t.id) as olts_count,
        (SELECT COUNT(*) FROM ctos WHERE tenant_id = t.id) as ctos_count,
        (SELECT COUNT(*) FROM ces WHERE tenant_id = t.id) as ces_count,
        (SELECT COUNT(*) FROM clients WHERE tenant_id = t.id) as clientes_count,
        (SELECT COUNT(*) FROM cables WHERE tenant_id = t.id) as cabos_count,
        (SELECT COALESCE(SUM(calculated_distance_km),0) FROM cables WHERE tenant_id = t.id) as cabo_km,
        (SELECT COUNT(*) FROM fibers WHERE tenant_id = t.id) as fibers_count,
        (SELECT COUNT(*) FROM switches WHERE tenant_id = t.id) as switches_count,
        (SELECT COUNT(*) FROM routers WHERE tenant_id = t.id) as routers_count,
        (SELECT COUNT(*) FROM dios WHERE tenant_id = t.id) as dios_count,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as usuarios_count,
        (SELECT MAX(created_at) FROM clients WHERE tenant_id = t.id) as last_activity,
        (SELECT u.email FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.created_at LIMIT 1) as admin_email,
        (SELECT u.name FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.created_at LIMIT 1) as admin_name
      FROM tenants t WHERE t.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Empresa não encontrada' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { 
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

export default router;
