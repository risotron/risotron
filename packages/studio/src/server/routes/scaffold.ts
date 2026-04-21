import { Hono } from 'hono';
import { z } from 'zod';
import { scaffoldApp, type ScaffoldInput } from '../../lib/scaffold.js';

const scaffoldInputSchema = z
  .object({
    targetDir: z.string().min(1),
    appName: z.string().min(1),
    appSlug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'appSlug must be kebab-case'),
    version: z.string().min(1).default('0.1.0'),
    author: z.string().min(1),
    releaseProvider: z.enum(['github', 'generic-http']).default('github'),
    ghOwner: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.releaseProvider !== 'github' || Boolean(data.ghOwner),
    {
      message: 'ghOwner is required when releaseProvider is "github"',
      path: ['ghOwner'],
    },
  );

export const scaffoldRoute = new Hono();

scaffoldRoute.post('/api/scaffold', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: 'SCAFFOLD_FAILED', message: 'invalid JSON body' },
      400,
    );
  }

  const parsed = scaffoldInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: 'SCAFFOLD_FAILED',
        message: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      },
      400,
    );
  }

  try {
    const result = await scaffoldApp(parsed.data as ScaffoldInput);

    return c.json(result);
  } catch (e) {
    return c.json({ error: 'SCAFFOLD_FAILED', message: String(e) }, 400);
  }
});
