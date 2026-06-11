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

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const { queryWithRLS } = require('../db');
const bcryptjs = require('bcryptjs');

let app: any;
const request = require('supertest');
const express = require('express');

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

async function mountAndTestCrud(
  routePath: string,
  modulePath: string,
  mockRow: any,
  postBody?: any,
  opts?: { skipGetById?: boolean; skipPut?: boolean; skipDelete?: boolean; deleteSetupFn?: () => void }
) {
  const module = await import(modulePath);
  app.use(routePath, module.default);

  // GET list
  queryWithRLS.mockResolvedValue({ rows: [mockRow] });
  const listRes = await request(app).get(routePath);
  expect(listRes.status).toBe(200);
  expect(listRes.body.data).toBeDefined();

  // POST create
  queryWithRLS.mockResolvedValue({ rows: [mockRow] });
  const createBody = postBody || { name: 'Test Item' };
  const createRes = await request(app).post(routePath).send(createBody);
  if (createRes.status !== 200 && createRes.status !== 201) {
    console.log(`POST ${routePath} returned ${createRes.status}:`, createRes.body);
  }
  expect([200, 201]).toContain(createRes.status);

  // GET by id
  if (!opts?.skipGetById) {
    queryWithRLS.mockResolvedValue({ rows: [mockRow] });
    const getRes = await request(app).get(`${routePath}/123e4567-e89b-12d3-a456-426614174000`);
    expect(getRes.status).toBe(200);
  }

  // PUT update
  if (!opts?.skipPut && (createRes.status === 200 || createRes.status === 201)) {
    queryWithRLS.mockResolvedValue({ rows: [mockRow] });
    const putRes = await request(app).put(`${routePath}/123e4567-e89b-12d3-a456-426614174000`).send({ name: 'Updated' });
    if (putRes.status !== 200 && putRes.status !== 201) {
      console.log(`PUT ${routePath} returned ${putRes.status}:`, putRes.body);
    }
    expect([200, 201]).toContain(putRes.status);
  }

  // DELETE
  if (!opts?.skipDelete) {
    if (opts?.deleteSetupFn) {
      opts.deleteSetupFn();
    } else {
      queryWithRLS.mockResolvedValue({ rows: [{ id: 'test-id' }] });
    }
    const delRes = await request(app).delete(`${routePath}/123e4567-e89b-12d3-a456-426614174000`);
    expect([200, 201]).toContain(delRes.status);
  }
}

describe('Areas CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/areas', '../routes/areas', { id: 'a1', name: 'Area Test', geom: null }, { name: 'New Area', lat: -23.5, lng: -46.6 });
  });
});

describe('Cables CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/cables', '../routes/cables', {
      id: 'c1', name: 'Cable Test', node_a_name: 'A', node_b_name: 'B',
    }, { name: 'New Cable' });
  });
});

describe('CTOs CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/ctos', '../routes/ctos', { id: 'cto1', name: 'CTO Test' }, { name: 'New CTO', lat: -23.5, lng: -46.6 });
  });
});

describe('CEs CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/ces', '../routes/ces', { id: 'ce1', name: 'CE Test' }, { name: 'New CE', lat: -23.5, lng: -46.6 });
  });
});

describe('Clients CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/clients', '../routes/clients', { id: 'cl1', name: 'Client Test' }, { name: 'New Client' });
  });
});

describe('Projects CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/projects', '../routes/projects', { id: 'p1', name: 'Project Test' }, { name: 'New Project' });
  });
});

describe('POPs CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/pops', '../routes/pops', { id: 'pop1', name: 'POP Test' }, { name: 'New POP' }, {
      deleteSetupFn: () => {
        queryWithRLS.mockResolvedValueOnce({ rows: [] });
        queryWithRLS.mockResolvedValue({ rows: [{ id: 'pop1' }] });
      },
    });
  });
});

describe('OLTs CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/olts', '../routes/olts', { id: 'olt1', name: 'OLT Test' }, { name: 'New OLT', pop_id: '123e4567-e89b-12d3-a456-426614174000' });
  });
});

describe('Splices CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/splices', '../routes/splices', { id: 's1', splice_type: 'fusion' }, { splice_type: 'fusion', fiber_a_id: null, fiber_b_id: null });
  });
});

describe('Splice Trays CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/splice-trays', '../routes/spliceTrays', { id: 'st1', tray_number: 1 }, { tray_number: 1, total_splices: 12, cto_id: '123e4567-e89b-12d3-a456-426614174000' }, { skipPut: true });
  });
});

describe('Splitters CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/splitters', '../routes/splitters', { id: 'sp1', catalog_splitter_id: 'cat1' }, { catalog_splitter_id: 'cat1' }, { skipPut: true });
  });
});

describe('Project Folders CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/project-folders', '../routes/projectFolders', { id: 'pf1', name: 'Folder Test' }, { name: 'New Folder' }, { skipGetById: true });
  });
});

describe('Legend CRUD', () => {
  test('full CRUD cycle', async () => {
    await mountAndTestCrud('/api/legend', '../routes/legend', { id: 'l1', name: 'Legend Item' }, { name: 'New Legend', node_type: 'cto' }, { skipGetById: true });
  });
});

describe('Users CRUD', () => {
  test('full CRUD cycle', async () => {
    bcryptjs.hash.mockResolvedValue('hashed-password');
    await mountAndTestCrud('/api/users', '../routes/users', { id: 'u1', name: 'User Test' }, { name: 'New User', email: 'user@test.com', password: 'password123' });
  });
});
