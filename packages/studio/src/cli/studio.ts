import { serve, type ServerType } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createServer } from '../server/app.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import open from 'open';

const DEFAULT_PORT = 5174;
const MAX_PORT = 5184;

export interface StudioOptions {
  readonly port?: number;
}

export async function runStudio(opts: StudioOptions): Promise<void> {
  const port = await findAvailablePort(opts.port ?? DEFAULT_PORT);
  const app = createStudioApp();
  const url = `http://localhost:${port}`;

  const server = serve({
    fetch: app.fetch,
    hostname: '127.0.0.1',
    port,
  });

  registerShutdown(server);

  console.log(`Studio running at ${url}`);
  await open(url);
}

function createStudioApp(): Hono {
  const app = createServer();
  const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'web');

  app.use('*', serveStatic({ root: webRoot }));
  app.get('*', serveStatic({ path: resolve(webRoot, 'index.html') }));

  return app;
}

async function findAvailablePort(startPort: number): Promise<number> {
  const maxPort = startPort === DEFAULT_PORT ? MAX_PORT : startPort;

  for (let port = startPort; port <= maxPort; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${maxPort}`);
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const tester = net
      .createServer()
      .once('error', () => resolvePort(false))
      .once('listening', () => {
        tester.close(() => resolvePort(true));
      })
      .listen(port, '127.0.0.1');
  });
}

function registerShutdown(server: ServerType): void {
  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }

      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
