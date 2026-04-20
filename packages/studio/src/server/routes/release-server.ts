import { Hono } from 'hono';

export const releaseServerRoute = new Hono();

releaseServerRoute.post('/api/release-server', (c) =>
  c.json({ error: 'NOT_IMPLEMENTED', message: 'brief-6' }, 501)
);
