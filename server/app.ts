// The PetPassage HTTP API (Hono). Mounted at /api by functions/api/[[route]].ts.
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Species, TripInput } from '../shared/types.ts';
import { filterAirlines } from './engine/airlines.ts';
import { buildPlan } from './engine/buildPlan.ts';
import { diffDays, isValidISO, todayISO } from './engine/dates.ts';
import { planToICS } from './engine/ics.ts';
import type { Store } from './store.ts';

type Env = { Variables: { store: Store } };

export class HttpError extends Error {
  constructor(public status: 400 | 404, message: string) {
    super(message);
  }
}

/** Use the visitor's local "today" when given (so dates match their calendar), within reason. */
function resolveToday(raw: string | undefined): string {
  const server = todayISO();
  if (raw && isValidISO(raw) && Math.abs(diffDays(server, raw)) <= 1) return raw;
  return server;
}

function parseTripInput(body: unknown): TripInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const origin = String(b.origin ?? '').toUpperCase();
  const dest = String(b.dest ?? '').toUpperCase();
  const species = b.species;
  if (!/^[A-Z]{2}$/.test(origin) || !/^[A-Z]{2}$/.test(dest)) throw new HttpError(400, 'Choose where you are flying from and to.');
  if (origin === dest) throw new HttpError(400, 'Origin and destination must be different.');
  if (species !== 'cat' && species !== 'dog') throw new HttpError(400, 'Choose cat or dog.');
  if (!isValidISO(b.arrivalDate)) throw new HttpError(400, 'Enter a valid arrival date (YYYY-MM-DD).');
  const petName = typeof b.petName === 'string' ? b.petName.trim().slice(0, 40) || undefined : undefined;
  return { origin, dest, species: species as Species, arrivalDate: b.arrivalDate, petName, snubNosed: Boolean(b.snubNosed) };
}

async function makePlan(store: Store, input: TripInput, today: string, doneIds: string[] = []) {
  const [origin, dest] = await Promise.all([store.country(input.origin), store.country(input.dest)]);
  if (!origin || !dest) throw new HttpError(400, 'We don’t support that country yet.');
  const [requirements, groups] = await Promise.all([
    store.requirementsFor(origin.code, dest.code),
    store.groups(dest.code),
  ]);
  return buildPlan({
    origin, dest, species: input.species, arrivalDate: input.arrivalDate, today,
    requirements, groups, doneIds, snubNosed: input.snubNosed,
  });
}

function newTripId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const queryInput = (c: Context): TripInput =>
  parseTripInput({
    origin: c.req.query('from'),
    dest: c.req.query('to'),
    species: c.req.query('species'),
    arrivalDate: c.req.query('arrival'),
    snubNosed: c.req.query('snub') === '1',
    petName: c.req.query('name'),
  });

export function createApp(getStore: (c: Context) => Store) {
  const app = new Hono<Env>().basePath('/api');

  app.use('*', async (c, next) => {
    c.set('store', getStore(c));
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500);
  });

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/countries', async (c) => c.json(await c.var.store.countries()));

  app.get('/glossary', async (c) => {
    c.header('Cache-Control', 'public, max-age=300');
    return c.json(await c.var.store.glossary());
  });

  app.get('/plan', async (c) => {
    const input = queryInput(c);
    const done = (c.req.query('done') ?? '').split(',').filter(Boolean);
    return c.json(await makePlan(c.var.store, input, resolveToday(c.req.query('today')), done));
  });

  app.get('/plan.ics', async (c) => {
    const input = queryInput(c);
    const plan = await makePlan(c.var.store, input, resolveToday(c.req.query('today')));
    return icsResponse(c, planToICS(plan, input.petName));
  });

  app.get('/airlines', async (c) => {
    const store = c.var.store;
    const from = (c.req.query('from') ?? '').toUpperCase();
    const to = (c.req.query('to') ?? '').toUpperCase();
    const [origin, dest] = await Promise.all([store.country(from), store.country(to)]);
    if (!origin || !dest) throw new HttpError(400, 'Choose where you are flying from and to.');
    const [airlines, routes] = await Promise.all([store.airlines(), store.airlineRoutes(from, to)]);
    return c.json(filterAirlines(airlines, routes, origin, dest, c.req.query('snub') === '1'));
  });

  app.post('/trips', async (c) => {
    const input = parseTripInput(await c.req.json().catch(() => null));
    const id = newTripId();
    await c.var.store.createTrip(id, input, new Date().toISOString());
    return c.json({ id }, 201);
  });

  const loadTrip = async (c: Context<Env>) => {
    const trip = await c.var.store.trip(c.req.param('id') ?? '');
    if (!trip) throw new HttpError(404, 'We couldn’t find that saved plan. Check the link.');
    return trip;
  };

  app.get('/trips/:id', async (c) => {
    const trip = await loadTrip(c);
    const plan = await makePlan(c.var.store, trip, resolveToday(c.req.query('today')), trip.doneIds);
    return c.json({ trip, plan });
  });

  app.put('/trips/:id', async (c) => {
    const trip = await loadTrip(c);
    const input = parseTripInput(await c.req.json().catch(() => null));
    await c.var.store.updateTrip(trip.id, input, new Date().toISOString());
    return c.json({ ok: true });
  });

  app.patch('/trips/:id/tasks/:reqId', async (c) => {
    const trip = await loadTrip(c);
    const body = (await c.req.json().catch(() => ({}))) as { done?: unknown };
    const reqId = c.req.param('reqId');
    if (!/^[a-z0-9-]{1,64}$/.test(reqId)) throw new HttpError(400, 'Unknown task.');
    await c.var.store.setTaskDone(trip.id, reqId, body.done !== false, new Date().toISOString());
    return c.json({ ok: true });
  });

  app.get('/trips/:id/calendar.ics', async (c) => {
    const trip = await loadTrip(c);
    const plan = await makePlan(c.var.store, trip, resolveToday(c.req.query('today')), trip.doneIds);
    return icsResponse(c, planToICS(plan, trip.petName, trip.id));
  });

  return app;
}

function icsResponse(c: Context, body: string) {
  return c.body(body, 200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="pet-move-plan.ics"',
  });
}
