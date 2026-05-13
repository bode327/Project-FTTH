import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/fiber/:fiberId', async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const fiberId = req.params.fiberId;
    const fiber = await queryWithRLS(req, 'SELECT * FROM fibers WHERE id = $1', [fiberId]);
    if (fiber.rows.length === 0) { res.status(404).json({ error: 'Fiber not found' }); return; }

    const splices = await queryWithRLS(req, `
      SELECT s.*, 
        fa.tube_number || '/' || fa.fiber_number as fiber_a_pos, fb.tube_number || '/' || fb.fiber_number as fiber_b_pos,
        c.name as cable_name, c.measured_distance_km
      FROM splices s
      LEFT JOIN fibers fa ON s.fiber_a_id = fa.id
      LEFT JOIN fibers fb ON s.fiber_b_id = fb.id
      LEFT JOIN cables c ON fa.cable_id = c.id
      WHERE s.fiber_a_id = $1 OR s.fiber_b_id = $1
      ORDER BY s.performed_at
    `, [fiberId]);

    const clients = await queryWithRLS(req, `
      SELECT cl.*, cto.name as cto_name
      FROM clients cl LEFT JOIN ctos cto ON cl.cto_id = cto.id
      WHERE cl.fiber_id = $1 AND cl.status = 'active'
    `, [fiberId]);

    const cable = fiber.rows[0].cable_id
      ? await queryWithRLS(req, 'SELECT * FROM cables WHERE id = $1', [fiber.rows[0].cable_id])
      : { rows: [] };

    let cumulativeDistance = 0;
    const spliceLocations = splices.rows.map(s => {
      const dist = cable.rows[0]?.measured_distance_km || 0;
      cumulativeDistance += dist / (splices.rows.length || 1);
      return { id: s.id, position_km: Math.round(cumulativeDistance * 1000) / 1000, fiber_pos: s.fiber_a_pos || s.fiber_b_pos, splice_type: s.splice_type, loss_db: s.loss_db };
    });

    res.json({
      data: {
        fiber_id: fiberId,
        tube_number: fiber.rows[0].tube_number,
        fiber_number: fiber.rows[0].fiber_number,
        status: fiber.rows[0].status,
        cable: cable.rows[0] || null,
        affected_clients: clients.rows.map(c => ({ id: c.id, name: c.name, address: c.address, cto_name: c.cto_name })),
        splice_points: spliceLocations,
        total_splices: splices.rows.length,
        suggested_repair_points: spliceLocations.filter(s => s.position_km > 0).slice(0, 3),
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/fiber/:fiberId/otdr', [
  param('fiberId').isUUID(),
], async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const { distance_m, estimated_loss_db } = req.body;
    if (!distance_m) { res.status(400).json({ error: 'distance_m is required (from OTDR)' }); return; }

    const fiber = await queryWithRLS(req, 'SELECT * FROM fibers WHERE id = $1', [req.params.fiberId]);
    if (fiber.rows.length === 0) { res.status(404).json({ error: 'Fiber not found' }); return; }

    const splices = await queryWithRLS(req, `
      SELECT s.*, fa.tube_number || '/' || fa.fiber_number as fiber_pos
      FROM splices s LEFT JOIN fibers fa ON s.fiber_a_id = fa.id
      WHERE s.fiber_a_id = $1 OR s.fiber_b_id = $1
      ORDER BY s.performed_at
    `, [req.params.fiberId]);

    const cable = fiber.rows[0].cable_id
      ? await queryWithRLS(req, 'SELECT * FROM cables WHERE id = $1', [fiber.rows[0].cable_id])
      : { rows: [] };

    const totalCableDist = parseFloat(cable.rows[0]?.measured_distance_km || cable.rows[0]?.calculated_distance_km || 0) * 1000;
    const breakPositionPercent = totalCableDist > 0 ? (distance_m / totalCableDist) * 100 : 0;

    const clients = await queryWithRLS(req, 'SELECT * FROM clients WHERE fiber_id = $1 AND status = $2', [req.params.fiberId, 'active']);

    const estimatedSplice = splices.rows.find(s => {
      const spliceDist = (totalCableDist / (splices.rows.length || 1)) * splices.rows.indexOf(s);
      return Math.abs(spliceDist - distance_m) < 100;
    });

    res.json({
      data: {
        fiber_id: req.params.fiberId,
        otdr_distance_m: distance_m,
        estimated_loss_db: estimated_loss_db || null,
        cable_total_m: totalCableDist,
        break_position_percent: Math.round(breakPositionPercent * 100) / 100,
        estimated_break_from_olt_m: distance_m,
        closest_splice: estimatedSplice ? { id: estimatedSplice.id, fiber_pos: estimatedSplice.fiber_pos, type: estimatedSplice.splice_type } : null,
        affected_clients_count: clients.rows.length,
        affected_clients: clients.rows.map(c => ({ name: c.name, address: c.address })),
        repair_recommendation: estimatedSplice
          ? `Possível rompimento próximo à fusão ${estimatedSplice.fiber_pos}. Verificar bandeja ${estimatedSplice.tray_position || '?'}.`
          : `Possível rompimento a ${distance_m}m do OLT. Verificar histórico de splices.`,
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/splice/:spliceId', async (req: AuthenticatedRequest, res) => {
  try {
    const splice = await queryWithRLS(req, `
      SELECT s.*, 
        fa.tube_number || '/' || fa.fiber_number as fiber_a_pos,
        fb.tube_number || '/' || fb.fiber_number as fiber_b_pos,
        fa.color as color_a, fb.color as color_b,
        fa.cable_id as cable_a_id, fb.cable_id as cable_b_id,
        c_a.name as cable_a_name, c_b.name as cable_b_name,
        st.tray_number, st.total_splices,
        cto.name as cto_name, ce.name as ce_name
      FROM splices s
      LEFT JOIN fibers fa ON s.fiber_a_id = fa.id
      LEFT JOIN fibers fb ON s.fiber_b_id = fb.id
      LEFT JOIN cables c_a ON fa.cable_id = c_a.id
      LEFT JOIN cables c_b ON fb.cable_id = c_b.id
      LEFT JOIN splice_trays st ON s.tray_id = st.id
      LEFT JOIN ctos cto ON st.cto_id = cto.id
      LEFT JOIN ces ce ON st.ce_id = ce.id
      WHERE s.id = $1
    `, [req.params.spliceId]);
    if (splice.rows.length === 0) { res.status(404).json({ error: 'Splice not found' }); return; }
    res.json({ data: splice.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;