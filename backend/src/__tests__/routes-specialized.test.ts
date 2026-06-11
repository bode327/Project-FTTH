import { setupTestEnv, teardownTestEnv } from './helpers';

jest.mock('../db', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
  queryWithRLS: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { tenant_id: 'test-tenant', user_id: 'test-user', role: 'admin' };
    req.tenantStatus = { status: 'active', plan: 'pro', features: {} };
    next();
  },
  requireSuperAdmin: (req: any, _res: any, next: any) => {
    req.user = { tenant_id: 'test-tenant', user_id: 'test-user', role: 'superadmin' };
    next();
  },
  AuthenticatedRequest: {},
}));

const { queryWithRLS } = require('../db');

let app: any;
const express = require('express');
const request = require('supertest');

beforeAll(() => {
  setupTestEnv();
});

afterAll(() => {
  teardownTestEnv();
});

beforeEach(async () => {
  jest.clearAllMocks();
  app = express();
  app.use(express.json());
});

describe('Catalogs Routes', () => {
  test('GET /types returns catalog types', async () => {
    const { default: router } = await import('../routes/catalogs');
    app.use('/api/catalogs', router);

    const res = await request(app).get('/api/catalogs/types');
    expect(res.status).toBe(200);
    expect(res.body.data).toContain('olt-model');
    expect(res.body.data).toContain('cable-type');
  });

  test('GET /:type returns items', async () => {
    const { default: router } = await import('../routes/catalogs');
    app.use('/api/catalogs', router);

    queryWithRLS.mockResolvedValue({ rows: [{ id: '1', brand: 'FiberHome', model: 'Model X' }] });
    const res = await request(app).get('/api/catalogs/olt-model');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('POST /:type creates item', async () => {
    const { default: router } = await import('../routes/catalogs');
    app.use('/api/catalogs', router);

    queryWithRLS.mockResolvedValue({ rows: [{ id: 'new', brand: 'Test', model: 'M1' }] });
    const res = await request(app)
      .post('/api/catalogs/olt-model')
      .send({ brand: 'Test', model: 'M1', total_slots: 16 });
    expect(res.status).toBe(201);
  });

  test('rejects invalid catalog type', async () => {
    const { default: router } = await import('../routes/catalogs');
    app.use('/api/catalogs', router);

    const res = await request(app).get('/api/catalogs/invalid-type');
    expect(res.status).toBe(400);
  });

  test('POST cable-type with visual config', async () => {
    const { default: router } = await import('../routes/catalogs');
    app.use('/api/catalogs', router);

    queryWithRLS.mockResolvedValue({ rows: [{ id: 'ct1', name: 'Cabo 36FO', fiber_count: 36, color: '#3b82f6', stroke_width: 3, dashed: false }] });
    const res = await request(app)
      .post('/api/catalogs/cable-type')
      .send({ name: 'Cabo 36FO', fiber_count: 36, color: '#3b82f6', stroke_width: 3 });
    expect(res.status).toBe(201);
  });
});

describe('Fibers Routes', () => {
  test('GET / lists fibers', async () => {
    const { default: router } = await import('../routes/fibers');
    app.use('/api/fibers', router);

    queryWithRLS.mockResolvedValue({ rows: [{ id: 'f1', tube_number: 1, fiber_number: 1, cable_name: 'Cabo A' }] });
    const res = await request(app).get('/api/fibers');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('GET /free returns only free fibers', async () => {
    const { default: router } = await import('../routes/fibers');
    app.use('/api/fibers', router);

    queryWithRLS.mockResolvedValue({ rows: [{ id: 'f2', status: 'free' }] });
    const res = await request(app).get('/api/fibers/free');
    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('free');
  });

  test('PUT /:id/status updates fiber status', async () => {
    const { default: router } = await import('../routes/fibers');
    app.use('/api/fibers', router);

    queryWithRLS.mockResolvedValue({ rows: [{ id: 'f1', status: 'in_use' }] });
    const res = await request(app)
      .put('/api/fibers/123e4567-e89b-12d3-a456-426614174000/status')
      .send({ status: 'in_use' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_use');
  });

  test('rejects invalid status', async () => {
    const { default: router } = await import('../routes/fibers');
    app.use('/api/fibers', router);

    const res = await request(app)
      .put('/api/fibers/123e4567-e89b-12d3-a456-426614174000/status')
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });
});

describe('Fusion Diagram Routes', () => {
  test('GET /tray/:trayId returns splice diagram', async () => {
    const { default: router } = await import('../routes/fusionDiagram');
    app.use('/api/fusion-diagram', router);

    queryWithRLS
      .mockResolvedValueOnce({ rows: [{ id: 'tray1', total_splices: 12, tray_number: 1 }] })
      .mockResolvedValueOnce({ rows: [
        { tray_position: 1, splice_type: 'fusion', fiber_a_label: '1/1', fiber_b_label: '2/1', color_a: '#f00', color_b: '#00f', loss_db: '0.15' },
      ] });

    const res = await request(app).get('/api/fusion-diagram/tray/tray1');
    expect(res.status).toBe(200);
    expect(res.body.data.diagram).toHaveLength(12);
    expect(res.body.data.diagram[0].status).toBe('spliced');
    expect(res.body.data.diagram[1].status).toBe('empty');
  });

  test('GET /cto/:ctoId returns full CTO diagram', async () => {
    const { default: router } = await import('../routes/fusionDiagram');
    app.use('/api/fusion-diagram', router);

    queryWithRLS
      .mockResolvedValueOnce({ rows: [{ id: 'cto1', name: 'CTO Centro', capacity: 8 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'tray1', tray_number: 1, total_splices: 12 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'sp1', ratio: '1:8', insertion_loss_db: '7.0' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'cl1', name: 'Client A', status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ tray_position: 1, splice_type: 'fusion', fiber_a_label: '1/1', fiber_b_label: '2/1' }] });

    const res = await request(app).get('/api/fusion-diagram/cto/cto1');
    expect(res.status).toBe(200);
    expect(res.body.data.total_trays).toBe(1);
    expect(res.body.data.summary).toBeDefined();
  });
});

describe('Signal Routes', () => {
  test('GET /path/:ctoId calculates signal path', async () => {
    const { default: router } = await import('../routes/signal');
    app.use('/api/signal', router);

    queryWithRLS
      .mockResolvedValueOnce({ rows: [{ id: 'cto1', name: 'CTO Test' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'sp1', catalog_splitter_id: 'cat1', input_fiber_id: 'f1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'cl1', name: 'Client A', fiber_id: 'f2' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'cat1', insertion_loss_db: '7.0', ratio: '1:8' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'f1', cable_id: 'c1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'c1', measured_distance_km: '2.5', calculated_distance_km: null }] })
      .mockResolvedValueOnce({ rows: [] }) // splices for input fiber
      .mockResolvedValueOnce({ rows: [] }); // splices for client fiber

    const res = await request(app).get('/api/signal/path/cto1');
    expect(res.status).toBe(200);
    expect(res.body.data.total_loss_db).toBeDefined();
  });

  test('GET /client/:clientId calculates client budget', async () => {
    const { default: router } = await import('../routes/signal');
    app.use('/api/signal', router);

    queryWithRLS
      .mockResolvedValueOnce({ rows: [{ id: 'cl1', name: 'Client A', splitter_id: 'sp1', fiber_id: 'f1' }] })
      .mockResolvedValueOnce({ rows: [{ min_output_dbm: '3', wavelength_range: ['1310nm', '1490nm'] }] })
      .mockResolvedValueOnce({ rows: [{ catalog_splitter_id: 'cat1' }] })
      .mockResolvedValueOnce({ rows: [{ insertion_loss_db: '7.0', ratio: '1:8' }] })
      .mockResolvedValueOnce({ rows: [{ measured_distance_km: '1.5' }] })
      .mockResolvedValueOnce({ rows: [] }); // no splices

    const res = await request(app).get('/api/signal/client/cl1');
    expect(res.status).toBe(200);
    expect(res.body.data.estimated_power_rx_dbm).toBeDefined();
    expect(res.body.data.status).toBeDefined();
  });
});

describe('Rupture Routes', () => {
  test('GET /fiber/:fiberId analyzes rupture', async () => {
    const { default: router } = await import('../routes/rupture');
    app.use('/api/rupture', router);

    queryWithRLS
      .mockResolvedValueOnce({ rows: [{ id: 'f1', tube_number: 1, fiber_number: 1, status: 'broken', cable_id: 'c1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 's1', fiber_a_id: 'f1', fiber_b_id: 'f2' }] })
      .mockResolvedValueOnce({ rows: [] }) // no clients
      .mockResolvedValueOnce({ rows: [{ id: 'c1', measured_distance_km: '3.5' }] });

    const res = await request(app).get('/api/rupture/fiber/f1');
    expect(res.status).toBe(200);
    expect(res.body.data.affected_clients).toBeDefined();
    expect(res.body.data.splice_points).toBeDefined();
  });
});

describe('Viability Routes', () => {
  test('GET /check verifies coverage', async () => {
    const { default: router } = await import('../routes/viability');
    app.use('/api/viability', router);

    queryWithRLS
      .mockResolvedValueOnce({ rows: [{ id: 'cto1', name: 'CTO Test', distance_m: 500, capacity: 8 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'olt1', name: 'OLT Test', total_ports: '16', used_ports: '4' }] })
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const res = await request(app).get('/api/viability/check?lat=-23.5&lng=-46.6&radius_km=5');
    expect(res.status).toBe(200);
    expect(res.body.data.nearby_ctos).toBeDefined();
    expect(res.body.data.summary.viability).toBe('available');
  });

  test('GET /coverage returns coverage map', async () => {
    const { default: router } = await import('../routes/viability');
    app.use('/api/viability', router);

    queryWithRLS.mockResolvedValue({ rows: [{ id: 'cto1', name: 'CTO Test', lat: -23.5, lng: -46.6, active_clients: '3', splitters_installed: '1' }] });
    const res = await request(app).get('/api/viability/coverage');
    expect(res.status).toBe(200);
  });
});

describe('Reports Routes', () => {
  test('GET /summary returns statistics', async () => {
    const { default: router } = await import('../routes/reports');
    app.use('/api/reports', router);

    for (let i = 0; i < 8; i++) {
      queryWithRLS.mockResolvedValueOnce({ rows: [{ count: String(i * 5) }] });
    }

    const res = await request(app).get('/api/reports/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.pops).toBeDefined();
    expect(res.body.data.clients).toBeDefined();
  });

  test('GET /clients lists clients', async () => {
    const { default: router } = await import('../routes/reports');
    app.use('/api/reports', router);

    queryWithRLS.mockResolvedValue({ rows: [{ name: 'Client A', cto_name: 'CTO Centro' }] });
    const res = await request(app).get('/api/reports/clients');
    expect(res.status).toBe(200);
  });
});

describe('Swap Routes', () => {
  test('POST /swap/equipment performs swap', async () => {
    const { default: router } = await import('../routes/swap');
    app.use('/api/swap', router);

    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cto1', name: 'CTO Antigo' }] }) // SELECT old
        .mockResolvedValueOnce({ rows: [{ id: 'cto2', name: 'CTO Novo' }] }) // SELECT new
        .mockResolvedValueOnce(undefined) // UPDATE decommission
        .mockResolvedValueOnce(undefined) // INSERT history
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    const pool = require('../db').default;
    pool.connect.mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/swap/swap')
      .send({
        equipment_type: 'ctos',
        old_id: 'cto1',
        new_id: 'cto2',
        reason: 'Upgrade',
      });
    expect(res.status).toBe(200);
  });
});

describe('Superadmin Routes', () => {
  test('GET /tenants lists all tenants', async () => {
    const pool = require('../db').default;
    const { default: router } = await import('../routes/superadmin');
    app.use('/api/superadmin', router);

    // Superadmin bypasses auth middleware check, uses requireSuperAdmin directly
    // Since we already inject req.user, we need to handle it properly
    pool.query.mockResolvedValue({ rows: [{ id: 't1', name: 'Tenant A', plan: 'pro', status: 'active' }] });
    const res = await request(app).get('/api/superadmin/tenants');
    expect(res.status).toBe(200);
  });
});
