// The planning engine: turns the rules stored in the database into a dated,
// ordered checklist for one trip. Pure function — no I/O — so it is easy to test.

import type {
  Country,
  CountryGroup,
  Phase,
  Plan,
  PlanTask,
  PlanWarning,
  Requirement,
  Species,
  TaskStatus,
} from '../../shared/types.ts';
import { addDays, diffDays, prettyDate } from './dates.ts';

export interface PlanInput {
  origin: Country;
  dest: Country;
  species: Species;
  arrivalDate: string;
  today: string;
  /** Every candidate rule for this route (origin export + destination import + general). */
  requirements: Requirement[];
  groups: CountryGroup[];
  doneIds?: string[];
  snubNosed?: boolean;
}

/** How far we look ahead when suggesting a workable arrival date. */
const MAX_SEARCH_DAYS = 1000;

export function findGroup(groups: CountryGroup[], destCode: string, originCode: string) {
  return groups.find((g) => g.destCode === destCode && g.originCode === originCode) ?? null;
}

/** Pick the rules that apply to this origin, destination, species and pet. */
export function selectRequirements(input: Omit<PlanInput, 'today' | 'arrivalDate' | 'doneIds'>) {
  const { origin, dest, species, requirements, groups, snubNosed } = input;
  const group = findGroup(groups, dest.code, origin.code);
  const picked = requirements.filter((r) => {
    if (r.direction === 'import' && r.countryCode !== dest.code) return false;
    if (r.direction === 'export' && r.countryCode !== origin.code) return false;
    if (r.direction === 'general' && r.countryCode !== '*') return false;
    if (r.species !== 'both' && r.species !== species) return false;
    const a = r.appliesIf;
    if (a?.originGroups && (!group || !a.originGroups.includes(group.group))) return false;
    if (a?.destCodes && !a.destCodes.includes(dest.code)) return false;
    if (a?.originCodes && !a.originCodes.includes(origin.code)) return false;
    if (a?.snubNosed !== undefined && a.snubNosed !== Boolean(snubNosed)) return false;
    return true;
  });
  const ids = new Set(picked.map((r) => r.id));
  return {
    group,
    requirements: picked.map((r) => ({ ...r, dependsOn: r.dependsOn.filter((d) => ids.has(d)) })),
  };
}

/** Order rules so every dependency comes before the rules that need it. */
function topoSort(reqs: Requirement[]): Requirement[] {
  const byId = new Map(reqs.map((r) => [r.id, r]));
  const out: Requirement[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (r: Requirement) => {
    const s = state.get(r.id);
    if (s === 'done') return;
    if (s === 'visiting') throw new Error(`Circular dependency at ${r.id}`);
    state.set(r.id, 'visiting');
    for (const d of r.dependsOn) {
      const dep = byId.get(d);
      if (dep) visit(dep);
    }
    state.set(r.id, 'done');
    out.push(r);
  };
  [...reqs].sort((a, b) => b.deadlineDays - a.deadlineDays || a.sortOrder - b.sortOrder).forEach(visit);
  return out;
}

interface Slot {
  earliestStart: number; // days relative to today
  latestFinish: number; // days relative to today
}

/** Work out, for a given arrival date, the earliest start and latest finish of every step. */
function schedule(reqs: Requirement[], arrivalOffset: number, done: Set<string>) {
  const slots = new Map<string, Slot>();
  const critical = new Set(reqs.filter((r) => r.critical).map((r) => r.id));
  const NEG = -1e9;
  // Forward pass: earliest each step can be finished.
  const earliestFinish = new Map<string, number>();
  for (const r of reqs) {
    if (done.has(r.id)) {
      earliestFinish.set(r.id, NEG);
      slots.set(r.id, { earliestStart: NEG, latestFinish: 0 });
      continue;
    }
    let start = 0;
    if (r.windowDays !== null) start = Math.max(start, arrivalOffset - r.windowDays);
    for (const d of r.dependsOn) {
      const f = earliestFinish.get(d);
      if (f !== undefined && f !== NEG) start = Math.max(start, f + r.gapDays);
    }
    earliestFinish.set(r.id, start + r.durationDays);
    slots.set(r.id, { earliestStart: start, latestFinish: 0 });
  }
  // Backward pass: latest each step may finish so later steps can still happen.
  const latestFinish = new Map<string, number>();
  for (const r of reqs) latestFinish.set(r.id, arrivalOffset - r.deadlineDays);
  for (const r of [...reqs].reverse()) {
    const lf = latestFinish.get(r.id)!;
    const latestStart = lf - r.durationDays;
    if (done.has(r.id)) continue;
    for (const d of r.dependsOn) {
      if (done.has(d)) continue;
      // A nice-to-have step never pushes a required step earlier.
      if (!r.critical && critical.has(d)) continue;
      latestFinish.set(d, Math.min(latestFinish.get(d)!, latestStart - r.gapDays));
    }
  }
  let feasible = true;
  for (const r of reqs) {
    const slot = slots.get(r.id)!;
    slot.latestFinish = latestFinish.get(r.id)!;
    // Only legally required steps can make a date impossible.
    if (r.critical && !done.has(r.id) && slot.earliestStart + r.durationDays > slot.latestFinish) feasible = false;
  }
  return { slots, feasible };
}

export function phaseFor(daysBeforeArrival: number): Phase {
  if (daysBeforeArrival >= 180) return 'six-months';
  if (daysBeforeArrival >= 90) return 'three-months';
  if (daysBeforeArrival >= 30) return 'one-month';
  if (daysBeforeArrival >= 8) return 'weeks';
  if (daysBeforeArrival >= 0) return 'travel-week';
  return 'after';
}

export function buildPlan(input: PlanInput): Plan {
  const { origin, dest, species, arrivalDate, today } = input;
  const done = new Set(input.doneIds ?? []);
  const { group, requirements } = selectRequirements(input);
  const ordered = topoSort(requirements);
  const arrivalOffset = diffDays(today, arrivalDate);

  const { slots, feasible } = schedule(ordered, arrivalOffset, done);

  let earliestFeasibleArrival: string | null = null;
  if (!feasible) {
    for (let extra = 1; extra <= MAX_SEARCH_DAYS; extra++) {
      if (schedule(ordered, arrivalOffset + extra, done).feasible) {
        earliestFeasibleArrival = addDays(arrivalDate, extra);
        break;
      }
    }
  }

  const tasks: PlanTask[] = ordered.map((r) => {
    const slot = slots.get(r.id)!;
    const isDone = done.has(r.id);
    const latestStart = slot.latestFinish - r.durationDays;
    // Recommend starting with some breathing room, but never before it is allowed.
    const buffer = r.critical ? 14 : 7;
    const recommended = Math.max(slot.earliestStart, latestStart - buffer);
    const windowOpens = r.windowDays !== null ? addDays(arrivalDate, -r.windowDays) : null;
    const late = slot.latestFinish < 0 || slot.earliestStart + r.durationDays > slot.latestFinish;
    let status: TaskStatus;
    if (isDone) status = 'done';
    else if (late && !r.critical) status = 'due-soon'; // nice-to-have: just do it as soon as you can
    else if (slot.latestFinish < 0) status = 'overdue';
    else if (late) status = 'impossible';
    else if (recommended > 14 && slot.earliestStart > 0 && windowOpens && windowOpens > today) status = 'not-yet';
    else if (recommended <= 14) status = 'due-soon';
    else status = 'upcoming';

    // A late nice-to-have step simply becomes "as soon as possible".
    const softLate = late && !r.critical && !isDone;
    const finishBy = softLate ? Math.max(0, slot.earliestStart) + r.durationDays : slot.latestFinish;
    const startDay = softLate ? Math.max(0, slot.earliestStart) : Math.max(0, recommended);

    return {
      id: r.id,
      title: r.title,
      what: r.what,
      why: r.why,
      how: r.how,
      tip: r.tip,
      estCost: r.estCost,
      officialUrl: r.officialUrl,
      verification: r.verification,
      lastChecked: r.lastChecked,
      direction: r.direction,
      countryCode: r.countryCode,
      critical: r.critical,
      phase: finishBy > arrivalOffset ? 'after' : phaseFor(arrivalOffset - startDay),
      dueDate: addDays(today, finishBy),
      windowOpens,
      startBy: addDays(today, startDay),
      durationDays: r.durationDays,
      dependsOn: r.dependsOn,
      status,
      done: isDone,
      daysUntilDue: finishBy,
    };
  });

  // Show steps in the order you should start them; dependencies break ties.
  const rank = new Map(ordered.map((r, i) => [r.id, i]));
  tasks.sort(
    (a, b) =>
      a.startBy.localeCompare(b.startBy) || a.dueDate.localeCompare(b.dueDate) || rank.get(a.id)! - rank.get(b.id)!,
  );

  return {
    origin,
    dest,
    species,
    arrivalDate,
    today,
    originGroup: group,
    daysToArrival: arrivalOffset,
    feasible: feasible && arrivalOffset >= 0,
    earliestFeasibleArrival,
    warnings: buildWarnings(input, arrivalOffset, feasible, earliestFeasibleArrival, group),
    tasks,
  };
}

function buildWarnings(
  input: PlanInput,
  arrivalOffset: number,
  feasible: boolean,
  earliest: string | null,
  group: CountryGroup | null,
): PlanWarning[] {
  const w: PlanWarning[] = [];
  const { dest, origin, species, arrivalDate, snubNosed } = input;
  if (arrivalOffset < 0) {
    w.push({
      level: 'danger',
      title: 'That arrival date has already passed',
      message: 'Pick a future arrival date to get a timeline.',
    });
  } else if (!feasible) {
    w.push({
      level: 'danger',
      title: 'This arrival date is too soon',
      message: earliest
        ? `Some steps have waiting periods that can't fit before ${prettyDate(arrivalDate)}. The earliest realistic arrival is around ${prettyDate(earliest)}. Steps marked "Not enough time" are the ones causing this — talk to your vet straight away, and if you already finished a step, tick it off and the dates will update.`
        : 'Some required waiting periods cannot fit before this arrival date. Talk to your vet or a pet relocation agent.',
    });
  }
  if (!group) {
    w.push({
      level: 'warning',
      title: `We don't have a classification for ${origin.name} → ${dest.name}`,
      message: 'Rules may be stricter than shown. Check with the destination authority before planning.',
    });
  } else {
    w.push({ level: 'info', title: group.label, message: dest.quarantineNote });
  }
  if (!dest.acceptedModes.includes('cabin')) {
    w.push({
      level: 'info',
      title: `Your ${species} will most likely fly as cargo`,
      message: `${dest.name} generally doesn't let pets arrive in the passenger cabin. Your pet travels in a temperature- and pressure-controlled hold, booked separately from your ticket (often through a pet relocation agent).`,
    });
  }
  if (snubNosed) {
    w.push({
      level: 'warning',
      title: 'Snub-nosed breeds face extra airline limits',
      message:
        'Flat-faced breeds (e.g. Persian, Himalayan, Exotic Shorthair, Pug, French Bulldog) can have breathing trouble in the air. Many airlines refuse them in the hold or only in cooler months. Check the airline list carefully and ask your vet whether your pet is fit to fly.',
    });
  }
  const month = Number(arrivalDate.slice(5, 7));
  if (month >= 5 && month <= 9) {
    w.push({
      level: 'warning',
      title: 'Summer travel: watch for heat embargoes',
      message:
        'Many airlines stop carrying pets in the hold during hot months (often May–September) on some routes. Book early and have a backup plan.',
    });
  }
  return w;
}
