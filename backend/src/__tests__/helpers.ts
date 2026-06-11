import jwt from 'jsonwebtoken';
import { Response } from 'express';

export const TEST_JWT_SECRET = 'test-jwt-secret';
export const TEST_TENANT_ID = 'test-tenant-id';
export const TEST_USER_ID = 'test-user-id';

export function generateToken(overrides?: Record<string, any>): string {
  return jwt.sign(
    { tenant_id: TEST_TENANT_ID, user_id: TEST_USER_ID, role: 'admin', ...overrides },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function mockAuthenticatedRequest(overrides?: Record<string, any>): any {
  return {
    user: { tenant_id: TEST_TENANT_ID, user_id: TEST_USER_ID, role: 'admin', ...overrides?.user },
    tenantStatus: { status: 'active', plan: 'pro', features: { advanced: true } },
    headers: { authorization: `Bearer ${generateToken(overrides)}` },
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as any;
}

export function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

export function setupTestEnv(): void {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
}

export function teardownTestEnv(): void {
  delete process.env.JWT_SECRET;
}
