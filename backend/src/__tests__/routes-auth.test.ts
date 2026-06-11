import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

let mockPool: { query: jest.Mock; connect: jest.Mock };

jest.mock('../db', () => ({
  __esModule: true,
  get default() { return mockPool; },
  queryWithRLS: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcryptjs = require('bcryptjs');

function createApp() {
  const app = express();
  app.use(express.json());
  const authRoutes = require('../routes/auth').default;
  app.use('/api/auth', authRoutes);
  return app;
}

describe('Auth Routes', () => {
  beforeEach(() => {
    mockPool = { query: jest.fn().mockReturnThis(), connect: jest.fn() };
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('GET /api/auth/status', () => {
    test('returns isSetup=true when tenants exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      const app = createApp();
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.isSetup).toBe(true);
    });

    test('returns isSetup=false when no tenants exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      const app = createApp();
      const res = await request(app).get('/api/auth/status');
      expect(res.status).toBe(200);
      expect(res.body.isSetup).toBe(false);
    });
  });

  describe('POST /api/auth/setup', () => {
    test('creates tenant and admin user on first setup', async () => {
      jest.clearAllMocks();
      mockPool = { query: jest.fn().mockResolvedValueOnce({ rows: [{ count: '0' }] }), connect: jest.fn() };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'tenant-1' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
      bcryptjs.hash.mockResolvedValue('hashed-password');

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/setup')
        .send({ companyName: 'TestCo', adminName: 'Admin', email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Setup completed');
      expect(res.body.token).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('rejects setup if system already initialized', async () => {
      jest.clearAllMocks();
      mockPool = { query: jest.fn(), connect: jest.fn() };
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/setup')
        .send({ companyName: 'TestCo', adminName: 'Admin', email: 'admin@test.com', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already initialized');
    });

    test('validates required fields', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/setup')
        .send({ companyName: '', adminName: '', email: 'invalid', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('returns token on valid credentials', async () => {
      jest.clearAllMocks();
      mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 'u1', tenant_id: 't1', email: 'user@test.com', password_hash: 'hashed-pass', role: 'admin' }],
        }),
        connect: jest.fn(),
      };
      bcryptjs.compare.mockResolvedValue(true);

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'correct-password' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.role).toBe('admin');
    });

    test('rejects invalid email', async () => {
      jest.clearAllMocks();
      mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn() };
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'pass' });
      expect(res.status).toBe(401);
    });

    test('rejects wrong password', async () => {
      jest.clearAllMocks();
      mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 'u1', tenant_id: 't1', email: 'user@test.com', password_hash: 'hash', role: 'admin' }],
        }),
        connect: jest.fn(),
      };
      bcryptjs.compare.mockResolvedValue(false);

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    test('validates email and password presence', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: '' });
      expect(res.status).toBe(400);
    });
  });
});
