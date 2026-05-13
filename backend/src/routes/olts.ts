import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res: any) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT oc.*, p.name as pop_name
      FROM olt_chassis oc
      LEFT JOIN pops p ON oc.pop_id = p.id
      ORDER BY oc.name
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }
  try {
    const result = await queryWithRLS(req, `
      SELECT oc.*, p.name as pop_name
      FROM olt_chassis oc
      LEFT JOIN pops p ON oc.pop_id = p.id
      WHERE oc.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'OLT not found' });
      return;
    }
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/slots', param('id').isUUID(), async (req: AuthenticatedRequest, res: any) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT os.*, 
        (SELECT COUNT(*) FROM olt_ports op WHERE op.slot_id = os.id) as port_count
      FROM olt_slots os
      WHERE os.chassis_id = $1
      ORDER BY os.slot_number
    `, [req.params.id]);
    res.json({ data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 255 }).escape(),
    body('pop_id').isUUID(),
    body('model').optional().trim().escape(),
    body('brand').optional().trim().escape(),
    body('slots_total').optional().isInt({ min: 1, max: 64 }),
    body('catalog_olt_model_id').optional().isUUID(),
  ],
  async (req: AuthenticatedRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }
    try {
      const { name, pop_id, model, brand, slots_total, catalog_olt_model_id } = req.body;
      const result = await queryWithRLS(req,
        'INSERT INTO olt_chassis (tenant_id, pop_id, name, model, brand, slots_total, catalog_olt_model_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [req.user?.tenant_id, pop_id, name, model || null, brand || null, slots_total || 16, catalog_olt_model_id || null]
      );
      res.status(201).json({ data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.put('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID format' }); return; }
  try {
    const { name, model, brand, status } = req.body;
    const result = await queryWithRLS(req,
      `UPDATE olt_chassis SET name=COALESCE($1,name), model=COALESCE($2,model), brand=COALESCE($3,brand), status=COALESCE($4,status) WHERE id=$5 RETURNING *`,
      [name, model, brand, status, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'OLT not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID format' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM olt_chassis WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'OLT not found' }); return; }
    res.json({ message: 'OLT deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

// Slots
router.post('/:id/slots', [
  param('id').isUUID(),
  body('slot_number').isInt({ min: 1, max: 64 }),
  body('slots_type').optional().trim(),
  body('max_ports').optional().isInt({ min: 1, max: 64 }),
], async (req: AuthenticatedRequest, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return; }
  try {
    const { slot_number, slots_type, max_ports } = req.body;
    const result = await queryWithRLS(req,
      'INSERT INTO olt_slots (tenant_id, chassis_id, slot_number, slots_type, max_ports) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user?.tenant_id, req.params.id, slot_number, slots_type || 'PON', max_ports || 16]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;