// Shared types used by the database seed, the API and the React app.

export type Species = 'cat' | 'dog';
export type RabiesStatus = 'free' | 'controlled' | 'high';
export type TransportMode = 'cabin' | 'checked' | 'cargo';
/** How confident we are in a piece of data, shown to owners as a badge. */
export type Verification = 'official' | 'reviewed' | 'general';

export interface Country {
  code: string;
  name: string;
  flag: string;
  rabiesStatus: RabiesStatus;
  authorityName: string;
  authorityUrl: string;
  /** One-paragraph plain-language summary of what bringing a pet IN looks like. */
  importSummary: string;
  /** Plain-language note on quarantine when arriving here. */
  quarantineNote: string;
  /** Ways a pet may physically arrive (e.g. Hong Kong only allows manifest cargo). */
  acceptedModes: TransportMode[];
  /** Main arrival airport(s) for pets. */
  petAirports: string;
}

/** How a destination classifies an origin (e.g. Hong Kong AFCD "Group II"). */
export interface CountryGroup {
  destCode: string;
  originCode: string;
  group: string;
  label: string;
}

export interface AppliesIf {
  originGroups?: string[];
  destCodes?: string[];
  originCodes?: string[];
  snubNosed?: boolean;
}

export interface Requirement {
  id: string;
  /** Country whose rule this is, or '*' for general tasks on every route. */
  countryCode: string;
  direction: 'import' | 'export' | 'general';
  species: Species | 'both';
  appliesIf?: AppliesIf;
  /** Must be finished at least this many days before arrival (negative = after arrival). */
  deadlineDays: number;
  /** Cannot be done earlier than this many days before arrival (null = any time). */
  windowDays: number | null;
  /** Days the step takes once started (processing, lab results, waiting). */
  durationDays: number;
  dependsOn: string[];
  /** Minimum days that must pass after the dependencies are finished. */
  gapDays: number;
  critical: boolean;
  title: string;
  what: string;
  why: string;
  how: string;
  tip?: string;
  estCost?: string;
  officialUrl?: string;
  verification: Verification;
  lastChecked: string;
  sortOrder: number;
}

export interface Airline {
  code: string;
  name: string;
  policyUrl: string;
  modes: TransportMode[];
  /** Countries the airline flies pets to/from (directly or via its hub). */
  serves: string[];
  hub: string;
  snubNosed: 'banned' | 'restricted' | 'accepted';
  summary: string;
  cabinNote?: string;
  cargoNote?: string;
  heatNote?: string;
  crateNote?: string;
  bookingTip: string;
  verification: Verification;
  lastChecked: string;
}

export interface AirlineRoute {
  airlineCode: string;
  originCode: string;
  destCode: string;
  routing: string;
  note: string;
  /** Lower = shown first (e.g. nonstop flights). */
  rank: number;
}

export interface GlossaryTerm {
  term: string;
  aliases: string[];
  explanation: string;
}

// ---------- Plan output ----------

export type Phase =
  | 'six-months'
  | 'three-months'
  | 'one-month'
  | 'weeks'
  | 'travel-week'
  | 'after';

export type TaskStatus = 'done' | 'overdue' | 'due-soon' | 'upcoming' | 'not-yet' | 'impossible';

export interface PlanTask {
  id: string;
  title: string;
  what: string;
  why: string;
  how: string;
  tip?: string;
  estCost?: string;
  officialUrl?: string;
  verification: Verification;
  lastChecked: string;
  direction: Requirement['direction'];
  countryCode: string;
  critical: boolean;
  phase: Phase;
  /** ISO date: finish by this date. */
  dueDate: string;
  /** ISO date: earliest allowed date, if the rule has a window. */
  windowOpens: string | null;
  /** ISO date: our recommended day to start. */
  startBy: string;
  durationDays: number;
  dependsOn: string[];
  status: TaskStatus;
  done: boolean;
  daysUntilDue: number;
}

export interface PlanWarning {
  level: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface Plan {
  origin: Country;
  dest: Country;
  species: Species;
  arrivalDate: string;
  today: string;
  originGroup: CountryGroup | null;
  daysToArrival: number;
  feasible: boolean;
  earliestFeasibleArrival: string | null;
  warnings: PlanWarning[];
  tasks: PlanTask[];
}

export interface AirlineOption extends Airline {
  usableModes: TransportMode[];
  route?: AirlineRoute;
  warnings: string[];
}

export interface TripInput {
  origin: string;
  dest: string;
  species: Species;
  arrivalDate: string;
  petName?: string;
  snubNosed?: boolean;
}

export interface Trip extends TripInput {
  id: string;
  createdAt: string;
  doneIds: string[];
}
