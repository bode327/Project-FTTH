import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT st.*, cto.name as cto_name, ce.name as ce_name,
        (SELECT COUNT(*) FROM splices s WHERE s.tray_id = st.id) as splice_count
      FROM splice_trays st
      LEFT JOIN ctos cto ON st.cto_id = cto.id
      LEFT JOIN ces ce ON st.ce_id = ce.id
      ORDER BY st.tray_number
    `, []);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM splice_trays WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Tray not found' }); return; }
    res.json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { cto_id, ce_id, tray_number, total_splices } = req.body;
    if (!tray_number) { res.status(400).json({ error: 'tray_number is required' }); return; }
    if (!cto_id && !ce_id) { res.status(400).json({ error: 'cto_id or ce_id is required' }); return; }
    const result = await queryWithRLS(req,
      'INSERT INTO splice_trays (tenant_id, cto_id, ce_id, tray_number, total_splices) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user?.tenant_id, cto_id || null, ce_id || null, tray_number, total_splices || 12]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', param('id').isUUID(), async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const result = await queryWithRLS(req, 'DELETE FROM splice_trays WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Tray not found' }); return; }
    res.json({ message: 'Tray deleted' });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;