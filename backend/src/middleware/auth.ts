import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';

export interface AuthenticatedRequest extends Request {
  user?: {
    tenant_id: string;
    user_id: string;
    role?: string;
  };
  tenantStatus?: {
    status: string;
    plan: string;
    features: Record<string, boolean>;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured.');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { tenant_id: string; user_id: string; role?: string };

    req.user = decoded;

    const tenantResult = await pool.query(
      'SELECT status, plan, features FROM tenants WHERE id = $1',
      [decoded.tenant_id]
    );
    if (tenantResult.rows.length === 0) {
      console.error('Tenant not found:', decoded.tenant_id);
      res.status(403).json({ error: 'Empresa não encontrada.' });
      return;
    }

    const tenant = tenantResult.rows[0];
    req.tenantStatus = { status: tenant.status, plan: tenant.plan, features: tenant.features || {} };

    if (tenant.status === 'blocked') {
      res.status(403).json({ error: 'Empresa bloqueada por inadimplência. Contate o suporte.' });
      return;
    }
    if (tenant.status === 'suspended') {
      res.status(403).json({ error: 'Empresa suspensa. Contate o suporte.' });
      return;
    }
    if (tenant.status === 'cancelled') {
      res.status(403).json({ error: 'Empresa cancelada. Contate o suporte.' });
      return;
    }

    next();
  } catch (error) {
    console.error('Auth error:', (error as Error).message);
    res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acesso negado.' });
    return;
  }

  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { tenant_id: string; user_id: string; role?: string };
    if (decoded.role !== 'superadmin') {
      res.status(403).json({ error: 'Acesso restrito ao superadministrador.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido.' });
  }
};
