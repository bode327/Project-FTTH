import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
});

export const networkCalcQueue = new Queue('networkCalc', { connection: redisConnection });

const worker = new Worker(
  'networkCalc',
  async (job: Job) => {
    console.log(`[Worker] Started calculating network signal for tenant: ${job.data.tenant_id}`);

    // Simulação do tempo de processamento complexo em grafo (Top-Down)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log(`[Worker] Finished calculating network signal for tenant: ${job.data.tenant_id}`);
    return { success: true, processedNodes: 1542 };
  },
  { connection: redisConnection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});
