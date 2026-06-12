import { Pool } from 'pg';
import { AuthenticatedRequest } from './middleware/auth';

if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is not configured.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'ftth_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ftth_saas',
});

// Wrapper para executar query garantindo o RLS ativado para o tenant
export const queryWithRLS = async (req: AuthenticatedRequest, queryText: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const tenant_id = req.user?.tenant_id;
    if (!tenant_id) {
      throw new Error('Tenant ID missing from request');
    }

    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_tenant_id = $1', [tenant_id]);

    const result = params && params.length > 0
      ? await client.query(queryText, params)
      : await client.query(queryText);

    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export default pool;
