import jwt from 'jsonwebtoken';

jest.mock('../db', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockPool,
    queryWithRLS: jest.fn(),
  };
});

const mockPool = require('../db').default;

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('authenticateToken', () => {
    test('rejects request without token', async () => {
      const { authenticateToken } = await import('../middleware/auth');
      const req = { headers: {} } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado. Token não fornecido.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects request with invalid token', async () => {
      const { authenticateToken } = await import('../middleware/auth');
      const req = { headers: { authorization: 'Bearer invalid-token' } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('throws error if JWT_SECRET is not configured', async () => {
      delete process.env.JWT_SECRET;
      const { authenticateToken } = await import('../middleware/auth');
      const req = { headers: { authorization: 'Bearer token' } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('rejects request when tenant not found', async () => {
      const { authenticateToken } = await import('../middleware/auth');
      const token = jwt.sign(
        { tenant_id: 'nonexistent', user_id: 'u1' },
        process.env.JWT_SECRET!
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Empresa não encontrada.' });
    });

    test('rejects blocked tenant', async () => {
      const { authenticateToken } = await import('../middleware/auth');
      const token = jwt.sign(
        { tenant_id: 't1', user_id: 'u1' },
        process.env.JWT_SECRET!
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      mockPool.query.mockResolvedValueOnce({
        rows: [{ status: 'blocked', plan: 'basic', features: {} }],
      });

      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('bloqueada') });
    });

    test('rejects suspended tenant', async () => {
      const { authenticateToken } = await import('../middleware/auth');
      const token = jwt.sign(
        { tenant_id: 't1', user_id: 'u1' },
        process.env.JWT_SECRET!
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      mockPool.query.mockResolvedValueOnce({
        rows: [{ status: 'suspended', plan: 'basic', features: {} }],
      });

      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('rejects cancelled tenant', async () => {
      const { authenticateToken } = await import('../middleware/auth');
      const token = jwt.sign(
        { tenant_id: 't1', user_id: 'u1' },
        process.env.JWT_SECRET!
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      mockPool.query.mockResolvedValueOnce({
        rows: [{ status: 'cancelled', plan: 'basic', features: {} }],
      });

      await authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('passes valid token through', async () => {
      const { authenticateToken } = await import('../middleware/auth');
      const token = jwt.sign(
        { tenant_id: 't1', user_id: 'u1', role: 'admin' },
        process.env.JWT_SECRET!
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      mockPool.query.mockResolvedValueOnce({
        rows: [{ status: 'active', plan: 'pro', features: { advanced: true } }],
      });

      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user!.tenant_id).toBe('t1');
      expect(req.tenantStatus).toBeDefined();
      expect(req.tenantStatus!.status).toBe('active');
    });
  });

  describe('requireSuperAdmin', () => {
    test('rejects non-superadmin role', async () => {
      const { requireSuperAdmin } = await import('../middleware/auth');
      const token = jwt.sign(
        { tenant_id: 't1', user_id: 'u1', role: 'admin' },
        process.env.JWT_SECRET!
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      await requireSuperAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('superadministrador') });
    });

    test('passes superadmin role', async () => {
      const { requireSuperAdmin } = await import('../middleware/auth');
      const token = jwt.sign(
        { tenant_id: 't1', user_id: 'u1', role: 'superadmin' },
        process.env.JWT_SECRET!
      );
      const req = { headers: { authorization: `Bearer ${token}` } } as any;
      const res = { status: jest.fn(() => res), json: jest.fn() } as any;
      const next = jest.fn();

      await requireSuperAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
