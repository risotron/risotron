import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { releaseServerRoute } from './routes/release-server.js';
import { scaffoldRoute } from './routes/scaffold.js';

export function createServer(): Hono {
  const app = new Hono();

  app.use('/api/*', async (c, next) => {
    const origin = c.req.header('Origin');

    if (origin && !isLocalhostOrigin(origin)) {
      return c.json({ error: 'FORBIDDEN' }, 403);
    }

    await next();
  });

  app.use(
    '/api/*',
    cors({
      origin: (origin) => (isLocalhostOrigin(origin) ? origin : ''),
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    })
  );

  app.get('/api/health', (c) => c.json({ ok: true }));
  app.route('/', scaffoldRoute);
  app.route('/', releaseServerRoute);

  return app;
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}
