const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm.infotecmg.net/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined') localStorage.removeItem('token');
    window.location.href = '/login';
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (endpoint: string) => request(endpoint),
  post: (endpoint: string, body?: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body?: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};

export const apiRoutes = {
  pops: '/pops',
  olts: '/olts',
  ctos: '/ctos',
  ces: '/ces',
  cables: '/cables',
  clients: '/clients',
  fibers: '/fibers',
  splices: '/splices',
  splitters: '/splitters',
  spliceTrays: '/splice-trays',
  catalogs: '/catalogs',
  users: '/users',
  areas: '/areas',
  projects: '/projects',
  reports: '/reports',
  signal: '/signal',
  kml: '/kml',
  kmlImport: '/kml/import',
  kmlExport: '/kml/export',
  kmlTemplate: '/kml/template',
  rupture: '/rupture',
  viability: '/viability',
  fusionDiagram: '/fusion-diagram',
  networkNodes: '/network/nodes',
  swap: '/swap',
  swapEquipment: '/swap/equipment',
  swapHistory: '/swap/swap-history',
  networkDesigns: '/swap/network-designs',
};