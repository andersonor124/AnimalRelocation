// Pure helpers for reading/writing plans in the web address (no browser APIs here,
// so they can be unit-tested).
import type { TripInput } from '../../shared/types.ts';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const CODE = /^[A-Z]{2}$/;
const TASK_ID = /^[a-z0-9-]{1,64}$/;

/** Read a plan (and any shared progress) from a query string like "?from=CA&to=HK…". */
export function parsePlanQuery(search: string): { input: TripInput; sharedDone: string[] } | null {
  const p = new URLSearchParams(search);
  const origin = (p.get('from') ?? '').toUpperCase();
  const dest = (p.get('to') ?? '').toUpperCase();
  const species = p.get('species');
  const arrivalDate = p.get('arrival') ?? '';
  if (!CODE.test(origin) || !CODE.test(dest) || origin === dest) return null;
  if (species !== 'cat' && species !== 'dog') return null;
  if (!ISO.test(arrivalDate)) return null;
  const name = p.get('name')?.trim().slice(0, 40);
  return {
    input: { origin, dest, species, arrivalDate, snubNosed: p.get('snub') === '1', petName: name || undefined },
    sharedDone: (p.get('done') ?? '').split(',').filter((id) => TASK_ID.test(id)),
  };
}

/** Build the query string for a plan; include `done` to share progress. */
export function planQuery(t: TripInput, done: string[] = []): string {
  const p = new URLSearchParams({ from: t.origin, to: t.dest, species: t.species, arrival: t.arrivalDate });
  if (t.snubNosed) p.set('snub', '1');
  if (t.petName) p.set('name', t.petName);
  if (done.length) p.set('done', done.join(','));
  return '?' + p.toString().replace(/%2C/g, ',');
}

/** Storage key for one trip's ticked tasks on this device. */
export const progressKey = (t: TripInput) =>
  `petpassage:done:${t.origin}-${t.dest}-${t.species}-${t.arrivalDate}`;

/** Combine this device's ticks with ticks carried in a shared link (never loses either). */
export function mergeDone(local: string[], shared: string[]): string[] {
  return [...new Set([...local, ...shared])];
}
