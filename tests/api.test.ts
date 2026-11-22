import { describe, expect, it } from 'vitest';
import * as seed from '../db/seed/index.ts';
import { createApp } from '../server/app.ts';
import { MemoryStore } from '../server/store.ts';
import { addDays, todayISO } from '../server/engine/dates.ts';

const store = new MemoryStore(seed);
const app = createApp(() => store);
const arrival = addDays(todayISO(), 150);

const call = (path: string, init?: RequestInit) => app.request(path, init);

describe('API', () => {
  it('lists countries', async () => {
    const res = await call('/api/countries');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string }[];
    expect(body.map((c) => c.code)).toEqual(expect.arrayContaining(['CA', 'HK', 'AU', 'JP']));
  });

  it('builds a plan', async () => {
    const res = await call(`/api/plan?from=CA&to=HK&species=cat&arrival=${arrival}`);
    expect(res.status).toBe(200);
    const plan = (await res.json()) as { feasible: boolean; tasks: { id: string }[] };
    expect(plan.feasible).toBe(true);
    expect(plan.tasks.some((t) => t.id === 'hk-permit')).toBe(true);
  });

  it('rejects bad input with a friendly message', async () => {
    const res = await call('/api/plan?from=CA&to=CA&species=cat&arrival=2027-01-01');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/different/);
    expect((await call('/api/plan?from=CA&to=HK&species=fish&arrival=2027-01-01')).status).toBe(400);
    expect((await call('/api/plan?from=CA&to=HK&species=cat&arrival=2027-02-31')).status).toBe(400);
  });

  it('returns airline options', async () => {
    const res = await call('/api/airlines?from=CA&to=HK');
    const body = (await res.json()) as { suitable: { code: string }[] };
    expect(body.suitable[0].code).toBe('CX');
  });

  it('saves a trip, ticks a task, and exports a calendar', async () => {
    const created = await call('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: 'CA', dest: 'HK', species: 'cat', arrivalDate: arrival, petName: 'Mochi' }),
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(id.length).toBeGreaterThanOrEqual(20);

    const tick = await call(`/api/trips/${id}/tasks/hk-microchip`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    expect(tick.status).toBe(200);

    const got = (await (await call(`/api/trips/${id}`)).json()) as {
      trip: { petName: string; doneIds: string[] };
      plan: { tasks: { id: string; done: boolean }[] };
    };
    expect(got.trip.petName).toBe('Mochi');
    expect(got.trip.doneIds).toEqual(['hk-microchip']);
    expect(got.plan.tasks.find((t) => t.id === 'hk-microchip')!.done).toBe(true);

    const ics = await call(`/api/trips/${id}/calendar.ics`);
    expect(ics.headers.get('content-type')).toContain('text/calendar');
    expect(await ics.text()).not.toContain('Make sure your pet has an ISO microchip');
  });

  it('404s for unknown trips', async () => {
    expect((await call('/api/trips/nope')).status).toBe(404);
  });
});
