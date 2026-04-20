import { Hono } from 'hono';

export const scaffoldRoute = new Hono();

scaffoldRoute.post('/api/scaffold', (c) =>
  c.json({ error: 'NOT_IMPLEMENTED', message: 'brief-5' }, 501)
);
