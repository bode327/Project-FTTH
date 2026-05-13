import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

const FUSION_LOSS_DB = 0.15;
const MECHANICAL_SPLICE_LOSS_DB = 0.3;
const SPLICE_TRAY_LOSS_DB = 0.5;
const FIBER_ATENUATION_DB_KM = 0.35;

router.get('/path/:ctoId', async (req: AuthenticatedRequest, res) => {
  try {
    const ctoId = req.params.ctoId;
    const cto = await queryWithRLS(req, 'SELECT * FROM ctos WHERE id = $1', [ctoId]);
    if (cto.rows.length === 0) { res.status(404).json({ error: 'CTO not found' }); return; }

    const splitters = await queryWithRLS(req, 'SELECT * FROM splitters WHERE cto_id = $1', [ctoId]);
    const clients = await queryWithRLS(req, 'SELECT * FROM clients WHERE cto_id = $1 AND status = $2', [ctoId, 'active']);

    let totalLoss = 0;
    let path = [];

    for (const sp of splitters.rows) {
      const catalog = await queryWithRLS(req, 'SELECT * FROM catalog_splitter WHERE id = $1', [sp.catalog_splitter_id]);
      if (catalog.rows.length > 0) {
        totalLoss += parseFloat(catalog.rows[0].insertion_loss_db);
        path.push({ type: 'splitter', ratio: catalog.rows[0].ratio, loss: parseFloat(catalog.rows[0].insertion_loss_db) });
      }

      if (sp.input_fiber_id) {
        const fiber = await queryWithRLS(req, 'SELECT * FROM fibers WHERE id = $1', [sp.input_fiber_id]);
        if (fiber.rows.length > 0 && fiber.rows[0].cable_id) {
          const cable = await queryWithRLS(req, 'SELECT * FROM cables WHERE id = $1', [fiber.rows[0].cable_id]);
          if (cable.rows.length > 0) {
            const dist = parseFloat(cable.rows[0].measured_distance_km || cable.rows[0].calculated_distance_km || 0);
            totalLoss += dist * FIBER_ATENUATION_DB_KM;
            path.push({ type: 'fiber', distance_km: dist, loss: dist * FIBER_ATENUATION_DB_KM });
          }
        }
        const splices = await queryWithRLS(req, 'SELECT * FROM splices WHERE fiber_a_id = $1 OR fiber_b_id = $1', [sp.input_fiber_id]);
        for (const sp of splices.rows) {
          totalLoss += parseFloat(sp.loss_db || FUSION_LOSS_DB);
          totalLoss += SPLICE_TRAY_LOSS_DB;
          path.push({ type: 'splice', splice_type: sp.splice_type, loss: parseFloat(sp.loss_db || FUSION_LOSS_DB), tray_loss: SPLICE_TRAY_LOSS_DB });
        }
      }
    }

    for (const cl of clients.rows) {
      if (cl.fiber_id) {
        const splices = await queryWithRLS(req, 'SELECT * FROM splices WHERE fiber_a_id = $1 OR fiber_b_id = $1', [cl.fiber_id]);
        for (const sp of splices.rows) {
          totalLoss += parseFloat(sp.loss_db || FUSION_LOSS_DB);
          path.push({ type: 'splice', splice_type: sp.splice_type, loss: parseFloat(sp.loss_db || FUSION_LOSS_DB) });
        }
      }
    }

    res.json({
      data: {
        cto_id: ctoId,
        cto_name: cto.rows[0].name,
        total_splitters: splitters.rows.length,
        total_clients: clients.rows.length,
        total_loss_db: Math.round(totalLoss * 100) / 100,
        path,
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/client/:clientId', async (req: AuthenticatedRequest, res) => {
  try {
    const clientId = req.params.clientId;
    const client = await queryWithRLS(req, 'SELECT * FROM clients WHERE id = $1', [clientId]);
    if (client.rows.length === 0) { res.status(404).json({ error: 'Client not found' }); return; }

    const cl = client.rows[0];
    let totalLoss = 0;
    const path = [];

    const gbicResult = await queryWithRLS(req, `
      SELECT cg.min_output_dbm, cg.wavelength_range FROM gbics g
      JOIN olt_ports op ON g.port_id = op.id
      JOIN olt_slots os ON op.slot_id = os.id
      JOIN olt_chassis oc ON os.chassis_id = oc.id
      JOIN pops p ON oc.pop_id = p.id
      JOIN catalog_gbic cg ON g.catalog_gbic_id = cg.id
      LIMIT 1
    `, []);
    let powerTx = gbicResult.rows.length > 0 ? parseFloat(gbicResult.rows[0].min_output_dbm) : 3;
    path.push({ type: 'olt_output', power_dbm: powerTx });

    if (cl.splitter_id) {
      const sp = await queryWithRLS(req, 'SELECT * FROM splitters WHERE id = $1', [cl.splitter_id]);
      if (sp.rows.length > 0) {
        const catalog = await queryWithRLS(req, 'SELECT * FROM catalog_splitter WHERE id = $1', [sp.rows[0].catalog_splitter_id]);
        if (catalog.rows.length > 0) {
          const splitLoss = parseFloat(catalog.rows[0].insertion_loss_db);
          totalLoss += splitLoss;
          path.push({ type: 'splitter', ratio: catalog.rows[0].ratio, loss: splitLoss });
        }
      }
    }

    if (cl.fiber_id) {
      const fiber = await queryWithRLS(req, 'SELECT f.*, c.measured_distance_km FROM fibers f LEFT JOIN cables c ON f.cable_id = c.id WHERE f.id = $1', [cl.fiber_id]);
      if (fiber.rows.length > 0) {
        const dist = parseFloat(fiber.rows[0].measured_distance_km || 0);
        const fiberLoss = dist * FIBER_ATENUATION_DB_KM;
        totalLoss += fiberLoss;
        path.push({ type: 'fiber', distance_km: dist, loss: fiberLoss });

        const splices = await queryWithRLS(req, 'SELECT * FROM splices WHERE fiber_a_id = $1 OR fiber_b_id = $1', [cl.fiber_id]);
        for (const s of splices.rows) {
          const loss = parseFloat(s.loss_db || FUSION_LOSS_DB);
          totalLoss += loss;
          totalLoss += SPLICE_TRAY_LOSS_DB;
          path.push({ type: 'splice', loss, tray_loss: SPLICE_TRAY_LOSS_DB });
        }
      }
    }

    const receivedPower = Math.round((powerTx - totalLoss) * 100) / 100;
    const status = receivedPower >= -25 ? 'good' : receivedPower >= -28 ? 'warning' : 'critical';

    res.json({
      data: {
        client_id: clientId,
        client_name: cl.name,
        olt_power_tx_dbm: powerTx,
        total_loss_db: Math.round(totalLoss * 100) / 100,
        estimated_power_rx_dbm: receivedPower,
        status,
        path,
        thresholds: { good: '> -25 dBm', warning: '-25 to -28 dBm', critical: '< -28 dBm' },
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/full-network', async (req: AuthenticatedRequest, res) => {
  try {
    const clients = await queryWithRLS(req, 'SELECT id, name, cto_id, fiber_id, splitter_id FROM clients WHERE status = $1', ['active']);
    const results = [];
    for (const cl of clients.rows) {
      try {
        const gbicResult = await queryWithRLS(req, `
          SELECT cg.min_output_dbm FROM gbics g JOIN olt_ports op ON g.port_id = op.id
          JOIN olt_slots os ON op.slot_id = os.id JOIN olt_chassis oc ON os.chassis_id = oc.id
          JOIN pops p ON oc.pop_id = p.id JOIN catalog_gbic cg ON g.catalog_gbic_id = cg.id LIMIT 1
        `, []);
        let powerTx = gbicResult.rows.length > 0 ? parseFloat(gbicResult.rows[0].min_output_dbm) : 3;
        let totalLoss = 0;

        if (cl.splitter_id) {
          const catalog = await queryWithRLS(req, 'SELECT insertion_loss_db FROM catalog_splitter WHERE id = (SELECT catalog_splitter_id FROM splitters WHERE id = $1)', [cl.splitter_id]);
          if (catalog.rows.length > 0) totalLoss += parseFloat(catalog.rows[0].insertion_loss_db);
        }
        if (cl.fiber_id) {
          const cable = await queryWithRLS(req, 'SELECT measured_distance_km FROM cables WHERE id = (SELECT cable_id FROM fibers WHERE id = $1)', [cl.fiber_id]);
          if (cable.rows.length > 0) totalLoss += parseFloat(cable.rows[0].measured_distance_km || 0) * FIBER_ATENUATION_DB_KM;
          const splices = await queryWithRLS(req, 'SELECT loss_db FROM splices WHERE fiber_a_id = $1 OR fiber_b_id = $1', [cl.fiber_id]);
          for (const s of splices.rows) totalLoss += parseFloat(s.loss_db || FUSION_LOSS_DB);
        }

        const rx = Math.round((powerTx - totalLoss) * 100) / 100;
        results.push({ client_id: cl.id, client_name: cl.name, power_tx: powerTx, total_loss: Math.round(totalLoss * 100) / 100, power_rx: rx, status: rx >= -25 ? 'good' : rx >= -28 ? 'warning' : 'critical' });
      } catch { results.push({ client_id: cl.id, client_name: cl.name, power_tx: null, total_loss: null, power_rx: null, status: 'unknown' }); }
    }
    res.json({ data: results });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;