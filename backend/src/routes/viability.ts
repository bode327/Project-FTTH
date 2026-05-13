import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/check', async (req: AuthenticatedRequest, res) => {
  try {
    const { lat, lng, radius_km } = req.query;
    if (!lat || !lng) { res.status(400).json({ error: 'lat and lng are required' }); return; }

    const latVal = parseFloat(lat as string);
    const lngVal = parseFloat(lng as string);
    const radius = parseFloat(radius_km as string) || 5;

    const nearbyCTOs = await queryWithRLS(req, `
      SELECT c.id, c.name, c.address, c.capacity, c.geom,
        ST_Distance(c.geom, ST_SetSRID(ST_Point($1, $2), 4326)::geography) as distance_m
      FROM ctos c
      WHERE c.geom IS NOT NULL AND ST_DWithin(c.geom, ST_SetSRID(ST_Point($1, $2), 4326), $3 * 1000)
      ORDER BY distance_m
      LIMIT 10
    `, [lngVal, latVal, radius]);

    const nearbyOLTs = await queryWithRLS(req, `
      SELECT DISTINCT oc.id, oc.name, oc.model, p.name as pop_name,
        ST_Distance(p.geom, ST_SetSRID(ST_Point($1, $2), 4326)::geography) as distance_m,
        (SELECT COUNT(*) FROM olt_ports op2 JOIN olt_slots os2 ON op2.slot_id = os2.id WHERE os2.chassis_id = oc.id) as total_ports,
        (SELECT COUNT(*) FROM gbics g WHERE g.port_id IN (SELECT id FROM olt_ports op3 WHERE op3.slot_id IN (SELECT id FROM olt_slots WHERE chassis_id = oc.id))) as used_ports
      FROM olt_chassis oc
      JOIN pops p ON oc.pop_id = p.id
      WHERE p.geom IS NOT NULL AND ST_DWithin(p.geom, ST_SetSRID(ST_Point($1, $2), 4326), $3 * 1000)
      ORDER BY distance_m
      LIMIT 5
    `, [lngVal, latVal, radius]);

    const freeFibers = await queryWithRLS(req, `
      SELECT COUNT(*) as count FROM fibers f
      JOIN cables c ON f.cable_id = c.id
      JOIN network_nodes n ON c.node_a_id = n.id OR c.node_b_id = n.id
      WHERE f.status = 'free' AND n.geom IS NOT NULL
        AND ST_DWithin(n.geom, ST_SetSRID(ST_Point($1, $2), 4326), $3 * 1000)
    `, [lngVal, latVal, radius]);

    const availablePorts = await queryWithRLS(req, `
      SELECT COUNT(*) as count FROM olt_ports op
      JOIN olt_slots os ON op.slot_id = os.id
      JOIN olt_chassis oc ON os.chassis_id = oc.id
      JOIN pops p ON oc.pop_id = p.id
      WHERE p.geom IS NOT NULL AND ST_DWithin(p.geom, ST_SetSRID(ST_Point($1, $2), 4326), $3 * 1000)
        AND op.id NOT IN (SELECT port_id FROM gbics WHERE port_id IS NOT NULL)
    `, [lngVal, latVal, radius]);

    res.json({
      data: {
        nearby_ctos: nearbyCTOs.rows.map(r => ({
          id: r.id, name: r.name, address: r.address, capacity: r.capacity,
          distance_m: Math.round(r.distance_m), available_slots: r.capacity,
          coordinates: r.geom ? { lat: r.geom.y, lng: r.geom.x } : null
        })),
        nearby_olts: nearbyOLTs.rows.map(r => ({
          id: r.id, name: r.name, model: r.model, pop_name: r.pop_name, distance_m: Math.round(r.distance_m),
          total_ports: parseInt(r.total_ports, 10), used_ports: parseInt(r.used_ports, 10),
          available_ports: parseInt(r.total_ports, 10) - parseInt(r.used_ports, 10)
        })),
        summary: {
          free_fibers: parseInt(freeFibers.rows[0].count, 10),
          available_ports: parseInt(availablePorts.rows[0].count, 10),
          viability: parseInt(freeFibers.rows[0].count, 10) > 0 && parseInt(availablePorts.rows[0].count, 10) > 0 ? 'available' : 'limited'
        }
      }
    });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/coverage', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT c.id, c.name, c.address, c.capacity,
        ST_X(c.geom) as lng, ST_Y(c.geom) as lat,
        (SELECT COUNT(*) FROM clients cl WHERE cl.cto_id = c.id AND cl.status = 'active') as active_clients,
        (SELECT COUNT(*) FROM splitters sp WHERE sp.cto_id = c.id) as splitters_installed
      FROM ctos c WHERE c.geom IS NOT NULL
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;