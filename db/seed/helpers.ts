import type { Requirement } from '../../shared/types.ts';

/** Date the seed content was last reviewed. Shown in the app next to every rule. */
export const LAST_CHECKED = '2026-11-22';

let order = 0;

type ReqInput = Pick<Requirement, 'id' | 'title' | 'what' | 'why' | 'how' | 'deadlineDays'> &
  Partial<Omit<Requirement, 'id' | 'title' | 'what' | 'why' | 'how' | 'deadlineDays'>>;

/** Build a requirement with sensible defaults so seed files stay readable. */
export function req(countryCode: string, direction: Requirement['direction'], r: ReqInput): Requirement {
  return {
    countryCode,
    direction,
    species: 'both',
    windowDays: null,
    durationDays: 0,
    dependsOn: [],
    gapDays: 0,
    critical: true,
    verification: 'general',
    lastChecked: LAST_CHECKED,
    sortOrder: order++,
    ...r,
  };
}

/** Every destination health certificate id — export endorsements depend on whichever applies. */
export const DEST_HEALTH_CERTS = [
  'hk-health-cert',
  'gb-ahc',
  'eu-ahc',
  'au-health-cert',
  'jp-health-cert',
  'sg-health-cert',
  'ca-health-cert',
  'us-health-cert',
];
