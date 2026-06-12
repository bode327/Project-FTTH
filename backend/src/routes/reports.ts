import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const pops = await queryWithRLS(req, 'SELECT COUNT(*) FROM pops');
    const ctos = await queryWithRLS(req, 'SELECT COUNT(*) FROM ctos');
    const clients = await queryWithRLS(req, 'SELECT COUNT(*) FROM clients WHERE status = $1', ['active']);
    const cables = await queryWithRLS(req, 'SELECT COUNT(*) FROM cables');
    const splices = await queryWithRLS(req, 'SELECT COUNT(*) FROM splices');
    const splitters = await queryWithRLS(req, 'SELECT COUNT(*) FROM splitters');
    const gbics = await queryWithRLS(req, 'SELECT COUNT(*) FROM gbics WHERE status = $1', ['active']);
    const projects = await queryWithRLS(req, 'SELECT COUNT(*) FROM projects WHERE status = $1', ['draft']);
    res.json({
      data: {
        pops: parseInt(pops.rows[0].count, 10),
        ctos: parseInt(ctos.rows[0].count, 10),
        clients: parseInt(clients.rows[0].count, 10),
        cables: parseInt(cables.rows[0].count, 10),
        splices: parseInt(splices.rows[0].count, 10),
        splitters: parseInt(splitters.rows[0].count, 10),
        gbics: parseInt(gbics.rows[0].count, 10),
        projects_draft: parseInt(projects.rows[0].count, 10),
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/clients', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT c.name, c.address, c.phone, c.plan_mbps, c.status, cto.name as cto_name, cto.address as cto_address
      FROM clients c LEFT JOIN ctos cto ON c.cto_id = cto.id
      ORDER BY c.name
    `);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/network', async (req: AuthenticatedRequest, res) => {
  try {
    const pops = await queryWithRLS(req, "SELECT id, name, address, ST_X(geom) as lng, ST_Y(geom) as lat FROM pops WHERE geom IS NOT NULL");
    const ctos = await queryWithRLS(req, "SELECT id, name, address, ST_X(geom) as lng, ST_Y(geom) as lat FROM ctos WHERE geom IS NOT NULL");
    const ces = await queryWithRLS(req, "SELECT id, name, address, ST_X(geom) as lng, ST_Y(geom) as lat FROM ces WHERE geom IS NOT NULL");
    const cables = await queryWithRLS(req, "SELECT id, name, ST_AsText(geom) as geom_text FROM cables WHERE geom IS NOT NULL");
    res.json({ data: { pops: pops.rows, ctos: ctos.rows, ces: ces.rows, cables: cables.rows } });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/splices', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT s.id, s.splice_type, s.loss_db, s.tray_position, s.performed_at, s.performed_by, s.notes,
        fa.tube_number || '/' || fa.fiber_number as fiber_a, fb.tube_number || '/' || fb.fiber_number as fiber_b,
        c.name as cable_name, st.id as tray_id, st.tray_number
      FROM splices s
      LEFT JOIN fibers fa ON s.fiber_a_id = fa.id
      LEFT JOIN fibers fb ON s.fiber_b_id = fb.id
      LEFT JOIN splice_trays st ON s.tray_id = st.id
      LEFT JOIN cables c ON fa.cable_id = c.id
      ORDER BY s.performed_at DESC
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/fibers', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT f.id, f.tube_number, f.fiber_number, f.color, f.status,
        c.name as cable_name, c.measured_distance_km,
        cl.name as client_name
      FROM fibers f
      LEFT JOIN cables c ON f.cable_id = c.id
      LEFT JOIN clients cl ON cl.fiber_id = f.id
      ORDER BY f.cable_id, f.tube_number, f.fiber_number
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;