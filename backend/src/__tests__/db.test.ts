const mockClient = { query: jest.fn(), release: jest.fn() };
const mockPool = { connect: jest.fn(() => mockClient), query: jest.fn() };

jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

describe('Database Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_PASSWORD = 'test_password';
  });

  afterEach(() => {
    delete process.env.DB_PASSWORD;
  });

  test('throws error if DB_PASSWORD is not configured', () => {
    delete process.env.DB_PASSWORD;
    expect(() => {
      jest.isolateModules(() => {
        require('../db');
      });
    }).toThrow('DB_PASSWORD is not configured.');
  });

  test('queryWithRLS runs with tenant isolation', async () => {
    const { queryWithRLS } = await import('../db');
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: '1', name: 'test' }] })
      .mockResolvedValueOnce(undefined);

    const req = { user: { tenant_id: 'tenant-123', user_id: 'user-1', role: 'admin' } } as any;
    const result = await queryWithRLS(req, 'SELECT * FROM areas WHERE id = $1', ['area-1']);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('SET LOCAL app.current_tenant_id = $1', ['tenant-123']);
    expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM areas WHERE id = $1', ['area-1']);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(result.rows).toEqual([{ id: '1', name: 'test' }]);
  });

  test('queryWithRLS rolls back on error', async () => {
    const { queryWithRLS } = await import('../db');
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'));

    const req = { user: { tenant_id: 'tenant-123', user_id: 'user-1' } } as any;
    await expect(queryWithRLS(req, 'SELECT * FROM nowhere', [])).rejects.toThrow('DB error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('queryWithRLS throws if tenant_id is missing', async () => {
    const { queryWithRLS } = await import('../db');
    const req = { user: {} } as any;
    await expect(queryWithRLS(req, 'SELECT 1', [])).rejects.toThrow('Tenant ID missing from request');
  });

  test('queryWithRLS releases client after successful query', async () => {
    const { queryWithRLS } = await import('../db');
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined);

    const req = { user: { tenant_id: 'tenant-1', user_id: 'u1' } } as any;
    await queryWithRLS(req, 'SELECT 1', []);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
