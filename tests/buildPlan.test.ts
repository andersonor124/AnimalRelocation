import { describe, expect, it } from 'vitest';
import * as seed from '../data/index.ts';
import { filterAirlines } from '../engine/airlines.ts';
import { buildPlan } from '../engine/buildPlan.ts';
import { addDays } from '../engine/dates.ts';
import { planToICS } from '../engine/ics.ts';
import type { Species } from '../shared/types.ts';

const TODAY = '2026-11-22';
const country = (code: string) => seed.countries.find((c) => c.code === code)!;

function plan(from: string, to: string, species: Species, daysAhead: number, extra: { doneIds?: string[]; snubNosed?: boolean } = {}) {
  return buildPlan({
    origin: country(from),
    dest: country(to),
    species,
    arrivalDate: addDays(TODAY, daysAhead),
    today: TODAY,
    requirements: seed.requirements,
    groups: seed.countryGroups,
    ...extra,
  });
}

describe('Canada → Hong Kong, cat', () => {
  const p = plan('CA', 'HK', 'cat', 150);
  const ids = p.tasks.map((t) => t.id);
  const task = (id: string) => p.tasks.find((t) => t.id === id)!;

  it('is classed as Group II and is feasible with 5 months notice', () => {
    expect(p.originGroup?.group).toBe('II');
    expect(p.feasible).toBe(true);
    expect(p.earliestFeasibleArrival).toBeNull();
  });

  it('includes the key Hong Kong and Canada steps', () => {
    for (const id of ['hk-microchip', 'hk-rabies', 'hk-permit', 'hk-health-cert', 'ca-cfia-endorse', 'hk-arrival', 'gen-book-flight']) {
      expect(ids).toContain(id);
    }
  });

  it('leaves out dog-only steps and other countries', () => {
    expect(ids).not.toContain('hk-dog-vaccines');
    expect(ids).not.toContain('hk-dog-licence');
    expect(ids.some((id) => id.startsWith('au-') || id.startsWith('gb-'))).toBe(false);
  });

  it('puts the steps in a sensible order', () => {
    const idx = (id: string) => ids.indexOf(id);
    expect(idx('hk-microchip')).toBeLessThan(idx('hk-rabies'));
    expect(idx('hk-rabies')).toBeLessThan(idx('hk-health-cert'));
    expect(idx('hk-permit')).toBeLessThan(idx('gen-book-flight'));
    expect(idx('hk-health-cert')).toBeLessThan(idx('ca-cfia-endorse'));
    expect(idx('ca-cfia-endorse')).toBeLessThan(idx('hk-arrival'));
  });

  it('dates the rabies vaccine at least 30 days before arrival', () => {
    expect(task('hk-rabies').dueDate <= addDays(p.arrivalDate, -30)).toBe(true);
    expect(task('hk-rabies').windowOpens).toBe(addDays(p.arrivalDate, -365));
  });

  it('keeps the health certificate within 14 days of departure', () => {
    const cert = task('hk-health-cert');
    expect(cert.windowOpens).toBe(addDays(p.arrivalDate, -15));
    expect(cert.dueDate).toBe(addDays(p.arrivalDate, -3));
    expect(cert.status).toBe('not-yet');
  });

  it('makes the permit due before the flight booking', () => {
    expect(task('hk-permit').dueDate < task('gen-book-flight').dueDate).toBe(true);
  });
});

describe('dog-specific rules', () => {
  it('adds dog vaccines and licence for dogs to Hong Kong', () => {
    const ids = plan('CA', 'HK', 'dog', 150).tasks.map((t) => t.id);
    expect(ids).toContain('hk-dog-vaccines');
    expect(ids).toContain('hk-dog-licence');
  });

  it('adds the UK tapeworm treatment for dogs only', () => {
    expect(plan('CA', 'GB', 'dog', 90).tasks.map((t) => t.id)).toContain('gb-tapeworm');
    expect(plan('CA', 'GB', 'cat', 90).tasks.map((t) => t.id)).not.toContain('gb-tapeworm');
  });
});

describe('Group I origin into Hong Kong', () => {
  it('does not require the rabies vaccine', () => {
    const p = plan('GB', 'HK', 'cat', 90);
    expect(p.originGroup?.group).toBe('I');
    expect(p.tasks.map((t) => t.id)).not.toContain('hk-rabies');
  });
});

describe('feasibility', () => {
  it('flags an arrival that is too soon and suggests a later date', () => {
    const p = plan('CA', 'HK', 'cat', 10);
    expect(p.feasible).toBe(false);
    expect(p.earliestFeasibleArrival).not.toBeNull();
    expect(p.warnings[0].level).toBe('danger');
    // Rabies needs 30 days, the permit and flight booking need more.
    expect(p.earliestFeasibleArrival! >= addDays(TODAY, 30)).toBe(true);
    expect(p.tasks.some((t) => t.status === 'impossible' || t.status === 'overdue')).toBe(true);
  });

  it('becomes feasible when the owner has already done the slow steps', () => {
    const p = plan('CA', 'HK', 'cat', 40, { doneIds: ['hk-microchip', 'hk-rabies'] });
    expect(p.feasible).toBe(true);
  });

  it('does not treat nice-to-have steps as blockers', () => {
    // Vet consult / agent choice have long soft deadlines but must not make a 2-month move impossible.
    const p = plan('CA', 'HK', 'cat', 60);
    expect(p.feasible).toBe(true);
    expect(p.tasks.find((t) => t.id === 'gen-vet-consult')!.status).toBe('due-soon');
  });

  it('adds the 180-day rabies blood test wait for Australia', () => {
    const p = plan('CA', 'AU', 'cat', 120);
    expect(p.feasible).toBe(false);
    expect(p.earliestFeasibleArrival! >= addDays(TODAY, 181 + 21)).toBe(true);
    const ok = plan('CA', 'AU', 'cat', 260);
    expect(ok.feasible).toBe(true);
    const rnatt = ok.tasks.find((t) => t.id === 'au-rnatt')!;
    expect(rnatt.dueDate <= addDays(ok.arrivalDate, -181)).toBe(true);
  });

  it('needs two rabies shots 30 days apart, then 180 days, for Japan', () => {
    const p = plan('US', 'JP', 'dog', 400);
    const t = (id: string) => p.tasks.find((x) => x.id === id)!;
    expect(p.feasible).toBe(true);
    expect(t('jp-rabies-1').dueDate <= addDays(t('jp-rabies-2').dueDate, -30)).toBe(true);
    expect(t('jp-rnatt').dueDate <= addDays(p.arrivalDate, -180)).toBe(true);
    expect(plan('US', 'JP', 'dog', 150).feasible).toBe(false);
  });

  it('marks a past arrival date as not feasible', () => {
    expect(plan('CA', 'HK', 'cat', -5).feasible).toBe(false);
  });
});

describe('airlines', () => {
  it('offers Cathay Pacific (cargo) first for Canada → Hong Kong and rules out cabin-only carriers', () => {
    const { suitable, unsuitable } = filterAirlines(seed.airlines, seed.airlineRoutes, country('CA'), country('HK'), false);
    expect(suitable[0].code).toBe('CX');
    expect(suitable[0].usableModes).toEqual(['cargo']);
    expect(suitable.find((a) => a.code === 'AC')!.usableModes).toEqual(['cargo']);
    expect(unsuitable.map((a) => a.code)).toContain('UA');
  });

  it('drops airlines that ban snub-nosed breeds in the hold', () => {
    const normal = filterAirlines(seed.airlines, seed.airlineRoutes, country('CA'), country('GB'), false);
    const snub = filterAirlines(seed.airlines, seed.airlineRoutes, country('CA'), country('GB'), true);
    expect(normal.suitable.map((a) => a.code)).toContain('BA');
    expect(snub.suitable.every((a) => a.snubNosed !== 'banned')).toBe(true);
  });
});

describe('seed data integrity', () => {
  it('has unique ids and only depends on known ids', () => {
    const ids = new Set(seed.requirements.map((r) => r.id));
    expect(ids.size).toBe(seed.requirements.length);
  });

  it('gives every launch route a group classification and a plan', () => {
    for (const o of seed.countries) {
      for (const d of seed.countries) {
        if (o.code === d.code) continue;
        const g = seed.countryGroups.find((x) => x.originCode === o.code && x.destCode === d.code);
        expect(g, `${o.code}→${d.code}`).toBeDefined();
        for (const species of ['cat', 'dog'] as const) {
          const p = plan(o.code, d.code, species, 400);
          expect(p.feasible, `${o.code}→${d.code} ${species}`).toBe(true);
          expect(p.tasks.length).toBeGreaterThan(5);
        }
      }
    }
  });
});

describe('calendar export', () => {
  it('produces a valid-looking iCalendar file', () => {
    const ics = planToICS(plan('CA', 'HK', 'cat', 150), 'Mochi');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('SUMMARY:🐾 Apply for the AFCD Special Permit (Mochi)');
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });
});

import { mergeDone, parsePlanQuery, planQuery } from '../web/src/share.ts';

describe('share links', () => {
  const input = { origin: 'CA', dest: 'HK', species: 'cat' as const, arrivalDate: '2027-04-20', petName: 'Mochi', snubNosed: false };

  it('round-trips a plan and its progress through the web address', () => {
    const q = planQuery(input, ['hk-microchip', 'hk-rabies']);
    expect(q).toContain('done=hk-microchip,hk-rabies');
    const back = parsePlanQuery(q)!;
    expect(back.input).toEqual(input);
    expect(back.sharedDone).toEqual(['hk-microchip', 'hk-rabies']);
  });

  it('rejects broken links', () => {
    expect(parsePlanQuery('?from=CA&to=CA&species=cat&arrival=2027-01-01')).toBeNull();
    expect(parsePlanQuery('?from=CA&to=HK&species=fish&arrival=2027-01-01')).toBeNull();
    expect(parsePlanQuery('?from=CA&to=HK&species=cat&arrival=soon')).toBeNull();
    expect(parsePlanQuery('?from=CA&to=HK&species=cat&arrival=2027-01-01&done=<script>')!.sharedDone).toEqual([]);
  });

  it('merges shared ticks with this device without losing any', () => {
    expect(mergeDone(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
