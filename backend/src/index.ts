import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth';
import { queryWithRLS } from './db';
import { networkCalcQueue } from './jobs/networkWorker';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Mock endpoint to get a token for testing
app.post('/api/auth/mock', (req, res) => {
  const { tenant_id, user_id } = req.body;
  const token = jwt.sign(
    { tenant_id: tenant_id || '00000000-0000-0000-0000-000000000001', user_id: user_id || 'user1' },
    process.env.JWT_SECRET || 'supersecretjwtkey12345',
    { expiresIn: '1h' }
  );
  res.json({ token });
});

// Secure endpoint example
app.get('/api/network/nodes', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const result = await queryWithRLS(req, 'SELECT * FROM network_nodes LIMIT 10', []);
    res.json({ data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger an async calculation job
app.post('/api/network/calculate', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const tenant_id = req.user?.tenant_id;
    const job = await networkCalcQueue.add('calculateTenantNetwork', { tenant_id });
    res.json({ message: 'Cálculo de rede em andamento.', jobId: job.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check job status
app.get('/api/jobs/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await networkCalcQueue.getJob(jobId);
    if (!job) {
      res.status(404).json({ error: 'Job não encontrado' });
      return;
    }
    const state = await job.getState();
    res.json({ id: job.id, state, returnvalue: job.returnvalue });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
