// Cloudflare Pages Function: every request to /api/* is handled by the Hono app.
import { handle } from 'hono/cloudflare-pages';
import { createApp } from '../../server/app.ts';
import { D1Store } from '../../server/store.ts';

const app = createApp((c) => new D1Store((c.env as { DB: D1Database }).DB));

export const onRequest = handle(app);
