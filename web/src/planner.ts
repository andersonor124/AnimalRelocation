// Everything the app needs, computed in the browser from the rule files in /data.
import * as data from '../../data/index.ts';
import { filterAirlines } from '../../engine/airlines.ts';
import { buildPlan } from '../../engine/buildPlan.ts';
import { planToICS } from '../../engine/ics.ts';
import type { AirlineOption, Country, GlossaryTerm, Plan, TripInput } from '../../shared/types.ts';

export type { AirlineOption, Country, GlossaryTerm, Plan, TripInput };

/** The visitor's local date, so "today" matches their calendar. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const getCountries = (): Country[] => [...data.countries].sort((a, b) => a.name.localeCompare(b.name));
export const getGlossary = (): GlossaryTerm[] => data.glossary;
const country = (code: string) => data.countries.find((c) => c.code === code);

/** Returns null if a country code isn't one we support. */
export function makePlan(input: TripInput, doneIds: string[]): Plan | null {
  const origin = country(input.origin);
  const dest = country(input.dest);
  if (!origin || !dest) return null;
  return buildPlan({
    origin,
    dest,
    species: input.species,
    arrivalDate: input.arrivalDate,
    today: localToday(),
    requirements: data.requirements,
    groups: data.countryGroups,
    doneIds,
    snubNosed: input.snubNosed,
  });
}

export function getAirlines(input: TripInput): { suitable: AirlineOption[]; unsuitable: AirlineOption[] } {
  const origin = country(input.origin);
  const dest = country(input.dest);
  if (!origin || !dest) return { suitable: [], unsuitable: [] };
  return filterAirlines(data.airlines, data.airlineRoutes, origin, dest, Boolean(input.snubNosed));
}

/** Download every open task as an .ics calendar file. */
export function downloadCalendar(plan: Plan, petName?: string) {
  const blob = new Blob([planToICS(plan, petName)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pet-move-plan.ics';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
      /* storage unavailable — the app still works, progress just isn't remembered */
    }
  },
};
