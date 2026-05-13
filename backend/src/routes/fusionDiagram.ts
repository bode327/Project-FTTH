import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/tray/:trayId', async (req: AuthenticatedRequest, res) => {
  try {
    const trayId = req.params.trayId;
    const tray = await queryWithRLS(req, 'SELECT * FROM splice_trays WHERE id = $1', [trayId]);
    if (tray.rows.length === 0) { res.status(404).json({ error: 'Tray not found' }); return; }

    const splices = await queryWithRLS(req, `
      SELECT s.*,
        fa.tube_number || '/' || fa.fiber_number as fiber_a_label,
        fb.tube_number || '/' || fb.fiber_number as fiber_b_label,
        fa.color as color_a, fb.color as color_b
      FROM splices s
      LEFT JOIN fibers fa ON s.fiber_a_id = fa.id
      LEFT JOIN fibers fb ON s.fiber_b_id = fb.id
      WHERE s.tray_id = $1
      ORDER BY s.tray_position
    `, [trayId]);

    const totalPorts = tray.rows[0].total_splices;
    const usedPorts = splices.rows.length;
    const freePorts = totalPorts - usedPorts;

    const spliceDiagram = Array.from({ length: totalPorts }, (_, i) => {
      const splice = splices.rows.find(s => s.tray_position === i + 1);
      if (splice) {
        return {
          position: i + 1,
          type: splice.splice_type,
          fiber_a: splice.fiber_a_label,
          fiber_b: splice.fiber_b_label,
          color_a: splice.color_a,
          color_b: splice.color_b,
          loss_db: splice.loss_db,
          status: 'spliced'
        };
      }
      return { position: i + 1, type: 'empty', fiber_a: null, fiber_b: null, status: 'empty' };
    });

    res.json({
      data: {
        tray_id: trayId,
        tray_number: tray.rows[0].tray_number,
        cto_id: tray.rows[0].cto_id,
        ce_id: tray.rows[0].ce_id,
        total_ports: totalPorts,
        used_ports: usedPorts,
        free_ports: freePorts,
        diagram: spliceDiagram
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/cto/:ctoId', async (req: AuthenticatedRequest, res) => {
  try {
    const ctoId = req.params.ctoId;
    const cto = await queryWithRLS(req, 'SELECT * FROM ctos WHERE id = $1', [ctoId]);
    if (cto.rows.length === 0) { res.status(404).json({ error: 'CTO not found' }); return; }

    const trays = await queryWithRLS(req, 'SELECT * FROM splice_trays WHERE cto_id = $1 ORDER BY tray_number', [ctoId]);
    const splitters = await queryWithRLS(req, `
      SELECT sp.*, cs.ratio, cs.insertion_loss_db
      FROM splitters sp LEFT JOIN catalog_splitter cs ON sp.catalog_splitter_id = cs.id
      WHERE sp.cto_id = $1
    `, [ctoId]);
    const clients = await queryWithRLS(req, `
      SELECT cl.*, f.tube_number || '/' || f.fiber_number as fiber_label, f.color as fiber_color
      FROM clients cl LEFT JOIN fibers f ON cl.fiber_id = f.id
      WHERE cl.cto_id = $1 ORDER BY cl.name
    `, [ctoId]);

    const trayDiagrams = [];
    for (const tray of trays.rows) {
      const splices = await queryWithRLS(req, `
        SELECT s.*, fa.tube_number || '/' || fa.fiber_number as fiber_a_label, fb.tube_number || '/' || fb.fiber_number as fiber_b_label,
          fa.color as color_a, fb.color as color_b
        FROM splices s LEFT JOIN fibers fa ON s.fiber_a_id = fa.id LEFT JOIN fibers fb ON s.fiber_b_id = fb.id
        WHERE s.tray_id = $1 ORDER BY s.tray_position
      `, [tray.id]);

      trayDiagrams.push({
        tray_id: tray.id,
        tray_number: tray.tray_number,
        total_ports: tray.total_splices,
        splices: splices.rows.map(s => ({
          position: s.tray_position,
          type: s.splice_type,
          fiber_a: s.fiber_a_label,
          fiber_b: s.fiber_b_label,
          color_a: s.color_a,
          color_b: s.color_b,
          loss_db: s.loss_db,
          performed_by: s.performed_by,
          performed_at: s.performed_at
        }))
      });
    }

    res.json({
      data: {
        cto: cto.rows[0],
        total_trays: trays.rows.length,
        trays: trayDiagrams,
        splitters: splitters.rows.map(s => ({
          id: s.id,
          ratio: s.ratio,
          insertion_loss_db: s.insertion_loss_db,
          tray_number: s.tray_number,
          tray_position: s.tray_position,
          input_fiber_id: s.input_fiber_id
        })),
        clients: clients.rows.map(c => ({
          id: c.id,
          name: c.name,
          address: c.address,
          plan_mbps: c.plan_mbps,
          fiber_label: c.fiber_label,
          fiber_color: c.fiber_color,
          splitter_id: c.splitter_id,
          status: c.status
        })),
        summary: {
          total_capacity: cto.rows[0].capacity,
          active_clients: clients.rows.filter(c => c.status === 'active').length,
          installed_splitters: splitters.rows.length,
          available_ports: cto.rows[0].capacity - clients.rows.filter(c => c.status === 'active').length
        }
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;