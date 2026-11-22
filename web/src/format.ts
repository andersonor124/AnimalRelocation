import type { Phase, TaskStatus } from '../../shared/types.ts';

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { timeZone: 'UTC', ...opts });
}

export function fmtShort(iso: string) {
  return fmtDate(iso, { day: 'numeric', month: 'short' });
}

export function relDays(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n < 0) return `${-n} days ago`;
  if (n < 14) return `in ${n} days`;
  if (n < 60) return `in ${Math.round(n / 7)} weeks`;
  return `in ${Math.round(n / 30.4)} months`;
}

export const PHASES: { id: Phase; title: string; blurb: string }[] = [
  { id: 'six-months', title: '6+ months before', blurb: 'The long lead-time steps. Getting these right early decides how soon you can move.' },
  { id: 'three-months', title: '3–6 months before', blurb: 'Lining up permits, vets and how your pet will fly.' },
  { id: 'one-month', title: '1–3 months before', blurb: 'Vaccines, permits and booking the flight.' },
  { id: 'weeks', title: '1–4 weeks before', blurb: 'Paperwork with strict time windows — timing matters here.' },
  { id: 'travel-week', title: 'Travel week', blurb: 'Final checks, travel day and arrival.' },
  { id: 'after', title: 'After you arrive', blurb: 'Settling in at your new home.' },
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  done: 'Done',
  overdue: 'Overdue',
  'due-soon': 'Do this now',
  upcoming: 'Upcoming',
  'not-yet': 'Not yet — must be timed',
  impossible: 'Not enough time',
};
