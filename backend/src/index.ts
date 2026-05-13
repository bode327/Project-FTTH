import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthenticatedRequest, requireSuperAdmin } from './middleware/auth';
import { queryWithRLS } from './db';
import pool from './db';
import { networkCalcQueue } from './jobs/networkWorker';
import authRoutes from './routes/auth';
import popsRoutes from './routes/pops';
import oltsRoutes from './routes/olts';
import ctosRoutes from './routes/ctos';
import cesRoutes from './routes/ces';
import cablesRoutes from './routes/cables';
import splicesRoutes from './routes/splices';
import splittersRoutes from './routes/splitters';
import clientsRoutes from './routes/clients';
import fibersRoutes from './routes/fibers';
import catalogsRoutes from './routes/catalogs';
import usersRoutes from './routes/users';
import areasRoutes from './routes/areas';
import projectsRoutes from './routes/projects';
import reportsRoutes from './routes/reports';
import signalRoutes from './routes/signal';
import kmlRoutes from './routes/kml';
import ruptureRoutes from './routes/rupture';
import viabilityRoutes from './routes/viability';
import fusionDiagramRoutes from './routes/fusionDiagram';
import spliceTraysRoutes from './routes/spliceTrays';
import superadminRoutes from './routes/superadmin';
import swapRoutes from './routes/swap';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const corsOrigins = (process.env.CORS_ORIGINS || 'https://crm.infotecmg.net').split(',');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.NEXT_PUBLIC_API_URL || ''],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: false,
    frameguard: { action: 'deny' },
  })
);

app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: true }));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { error: 'Too many requests' }, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { error: 'Too many login attempts' }, standardHeaders: true, legacyHeaders: false });
const skipPaths = ['/api/auth/status', '/api/health'];
app.use((req, res, next) => {
  if (skipPaths.includes(req.path)) return next();
  globalLimiter(req, res, next);
});
app.use(hpp());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/debug-tenant', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'No token' }); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
    const result = await pool.query('SELECT id, name, status, plan FROM tenants WHERE id = $1', [decoded.tenant_id]);
    res.json({ tenant: result.rows[0], columns: result.fields.map((f: any) => f.name) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.use('/api/superadmin', superadminRoutes);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/pops', authenticateToken, popsRoutes);
app.use('/api/olts', authenticateToken, oltsRoutes);
app.use('/api/ctos', authenticateToken, ctosRoutes);
app.use('/api/ces', authenticateToken, cesRoutes);
app.use('/api/cables', authenticateToken, cablesRoutes);
app.use('/api/splices', authenticateToken, splicesRoutes);
app.use('/api/splitters', authenticateToken, splittersRoutes);
app.use('/api/clients', authenticateToken, clientsRoutes);
app.use('/api/fibers', authenticateToken, fibersRoutes);
app.use('/api/catalogs', authenticateToken, catalogsRoutes);
app.use('/api/areas', authenticateToken, areasRoutes);
app.use('/api/projects', authenticateToken, projectsRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/signal', authenticateToken, signalRoutes);
app.use('/api/kml', authenticateToken, kmlRoutes);
app.use('/api/rupture', authenticateToken, ruptureRoutes);
app.use('/api/viability', authenticateToken, viabilityRoutes);
app.use('/api/fusion-diagram', authenticateToken, fusionDiagramRoutes);
app.use('/api/splice-trays', authenticateToken, spliceTraysRoutes);

app.use('/api/swap', swapRoutes);

app.get('/api/network/nodes', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { area_id } = req.query;
    let query = 'SELECT id, tenant_id, type, name, address, area_id, ST_AsGeoJSON(geom) as geom FROM network_nodes';
    const params: any[] = [];
    if (area_id) { query += ' WHERE area_id = $1'; params.push(area_id); }
    query += ' ORDER BY name LIMIT 500';
    const result = await queryWithRLS(req, query, params);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/network/nodes/cables', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { node_a_id, node_b_id, area_id, path, cable_type_id } = req.body;
    if (!node_a_id || !node_b_id) { res.status(400).json({ error: 'node_a_id and node_b_id are required' }); return; }

    let cableAreaId = area_id || null;
    if (!cableAreaId) {
      const nodeA = await queryWithRLS(req, 'SELECT area_id FROM network_nodes WHERE id = $1', [node_a_id]);
      if (nodeA.rows.length > 0 && nodeA.rows[0].area_id) {
        cableAreaId = nodeA.rows[0].area_id;
      }
    }

    let cableTypeId = cable_type_id || null;
    if (!cableTypeId) {
      const defaultType = await queryWithRLS(req,
        `SELECT id FROM catalog_cable_type WHERE tenant_id = $1 AND name = 'Distribuição' LIMIT 1`,
        [req.user?.tenant_id]
      );
      if (defaultType.rows.length > 0) cableTypeId = defaultType.rows[0].id;
    }

    let extraCols = ', cable_type_id';
    const baseParams = [req.user?.tenant_id, cableAreaId, node_a_id, node_b_id, `Cabo ${Date.now()}`, cableTypeId];

    if (path && Array.isArray(path) && path.length >= 2) {
      const coordText = path.map((p: [number, number]) => `${p[0]} ${p[1]}`).join(', ');
      const geomWkt = `LINESTRING(${coordText})`;
      const distResult = await queryWithRLS(req,
        `SELECT ST_Length(ST_GeomFromText($1, 4326)::geography) / 1000 as km`,
        [geomWkt]
      );
      const distanceKm = Math.round((distResult.rows[0]?.km || 0) * 1000) / 1000;
      baseParams.push(distanceKm);
      extraCols += ', calculated_distance_km, geom';
    }

    const result = await queryWithRLS(req,
      `INSERT INTO cables (tenant_id, area_id, node_a_id, node_b_id, name${extraCols})
       VALUES ($1, $2, $3, $4, $5, $6${path ? ', $7' : ''}) RETURNING *`,
      baseParams
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/network/calculate', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const job = await networkCalcQueue.add('calculateTenantNetwork', { tenant_id: req.user?.tenant_id });
    res.json({ message: 'Cálculo de rede em andamento.', jobId: job.id });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/jobs/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const job = await networkCalcQueue.getJob(req.params.id as string);
    if (!job) { res.status(404).json({ error: 'Job não encontrado' }); return; }
    const state = await job.getState();
    res.json({ id: job.id, state, returnvalue: job.returnvalue });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

app.use((req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));