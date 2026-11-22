// Typed client for the PetPassage API.
import type { AirlineOption, Country, GlossaryTerm, Plan, Trip, TripInput } from '../../shared/types.ts';

export type { AirlineOption, Country, GlossaryTerm, Plan, Trip, TripInput };

/** The visitor's local date, so "today" matches their calendar. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export function tripQuery(t: TripInput, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams({
    from: t.origin,
    to: t.dest,
    species: t.species,
    arrival: t.arrivalDate,
    ...(t.snubNosed ? { snub: '1' } : {}),
    ...(t.petName ? { name: t.petName } : {}),
    ...extra,
  });
  return p.toString();
}

export const api = {
  countries: () => request<Country[]>('/api/countries'),
  glossary: () => request<GlossaryTerm[]>('/api/glossary'),
  plan: (t: TripInput, doneIds: string[]) =>
    request<Plan>(`/api/plan?${tripQuery(t, { today: localToday(), done: doneIds.join(',') })}`),
  airlines: (t: TripInput) =>
    request<{ suitable: AirlineOption[]; unsuitable: AirlineOption[] }>(
      `/api/airlines?from=${t.origin}&to=${t.dest}${t.snubNosed ? '&snub=1' : ''}`,
    ),
  createTrip: (t: TripInput) => request<{ id: string }>('/api/trips', { method: 'POST', body: JSON.stringify(t) }),
  updateTrip: (id: string, t: TripInput) =>
    request<{ ok: boolean }>(`/api/trips/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(t) }),
  trip: (id: string) =>
    request<{ trip: Trip; plan: Plan }>(`/api/trips/${encodeURIComponent(id)}?today=${localToday()}`),
  setDone: (id: string, reqId: string, done: boolean) =>
    request<{ ok: boolean }>(`/api/trips/${encodeURIComponent(id)}/tasks/${reqId}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    }),
  calendarUrl: (t: TripInput, tripId?: string) =>
    tripId
      ? `/api/trips/${encodeURIComponent(tripId)}/calendar.ics?today=${localToday()}`
      : `/api/plan.ics?${tripQuery(t, { today: localToday() })}`,
};

// ---- small, failure-safe browser storage helpers ----
export const local = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — fine, the app still works */
    }
  },
};
