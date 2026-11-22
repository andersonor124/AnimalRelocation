// Data access. `D1Store` reads Cloudflare D1; `MemoryStore` uses the seed data
// directly so the API can be tested without a database.
import type {
  Airline, AirlineRoute, Country, CountryGroup, GlossaryTerm, Requirement, Trip, TripInput,
} from '../shared/types.ts';

export interface Store {
  countries(): Promise<Country[]>;
  country(code: string): Promise<Country | null>;
  groups(destCode: string): Promise<CountryGroup[]>;
  requirementsFor(originCode: string, destCode: string): Promise<Requirement[]>;
  airlines(): Promise<Airline[]>;
  airlineRoutes(originCode: string, destCode: string): Promise<AirlineRoute[]>;
  glossary(): Promise<GlossaryTerm[]>;
  createTrip(id: string, input: TripInput, now: string): Promise<void>;
  trip(id: string): Promise<Trip | null>;
  setTaskDone(tripId: string, reqId: string, done: boolean, now: string): Promise<void>;
  updateTrip(id: string, input: TripInput, now: string): Promise<void>;
}

const parse = <T>(s: unknown, fallback: T): T => {
  if (typeof s !== 'string' || !s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};
const opt = (v: unknown) => (v === null || v === undefined ? undefined : String(v));

type Row = Record<string, unknown>;

const toCountry = (r: Row): Country => ({
  code: String(r.code), name: String(r.name), flag: String(r.flag),
  rabiesStatus: r.rabies_status as Country['rabiesStatus'],
  authorityName: String(r.authority_name), authorityUrl: String(r.authority_url),
  importSummary: String(r.import_summary), quarantineNote: String(r.quarantine_note),
  acceptedModes: parse(r.accepted_modes, []), petAirports: String(r.pet_airports),
});

const toRequirement = (r: Row): Requirement => ({
  id: String(r.id), countryCode: String(r.country_code),
  direction: r.direction as Requirement['direction'], species: r.species as Requirement['species'],
  appliesIf: parse(r.applies_if, undefined), deadlineDays: Number(r.deadline_days),
  windowDays: r.window_days === null ? null : Number(r.window_days),
  durationDays: Number(r.duration_days), dependsOn: parse(r.depends_on, []), gapDays: Number(r.gap_days),
  critical: Boolean(r.critical), title: String(r.title), what: String(r.what), why: String(r.why),
  how: String(r.how), tip: opt(r.tip), estCost: opt(r.est_cost), officialUrl: opt(r.official_url),
  verification: r.verification as Requirement['verification'], lastChecked: String(r.last_checked),
  sortOrder: Number(r.sort_order),
});

const toAirline = (r: Row): Airline => ({
  code: String(r.code), name: String(r.name), policyUrl: String(r.policy_url),
  modes: parse(r.modes, []), serves: parse(r.serves, []), hub: String(r.hub),
  snubNosed: r.snub_nosed as Airline['snubNosed'], summary: String(r.summary),
  cabinNote: opt(r.cabin_note), cargoNote: opt(r.cargo_note), heatNote: opt(r.heat_note),
  crateNote: opt(r.crate_note), bookingTip: String(r.booking_tip),
  verification: r.verification as Airline['verification'], lastChecked: String(r.last_checked),
});

export class D1Store implements Store {
  constructor(private db: D1Database) {}

  async countries() {
    const { results } = await this.db.prepare('SELECT * FROM countries ORDER BY name').all<Row>();
    return results.map(toCountry);
  }
  async country(code: string) {
    const r = await this.db.prepare('SELECT * FROM countries WHERE code = ?').bind(code).first<Row>();
    return r ? toCountry(r) : null;
  }
  async groups(destCode: string) {
    const { results } = await this.db
      .prepare('SELECT * FROM country_groups WHERE dest_code = ?').bind(destCode).all<Row>();
    return results.map((r) => ({
      destCode: String(r.dest_code), originCode: String(r.origin_code),
      group: String(r.group_name), label: String(r.label),
    }));
  }
  async requirementsFor(originCode: string, destCode: string) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM requirements
         WHERE (direction = 'import' AND country_code = ?1)
            OR (direction = 'export' AND country_code = ?2)
            OR direction = 'general'
         ORDER BY sort_order`,
      )
      .bind(destCode, originCode)
      .all<Row>();
    return results.map(toRequirement);
  }
  async airlines() {
    const { results } = await this.db.prepare('SELECT * FROM airlines ORDER BY name').all<Row>();
    return results.map(toAirline);
  }
  async airlineRoutes(originCode: string, destCode: string) {
    const { results } = await this.db
      .prepare('SELECT * FROM airline_routes WHERE origin_code = ? AND dest_code = ?')
      .bind(originCode, destCode).all<Row>();
    return results.map((r) => ({
      airlineCode: String(r.airline_code), originCode: String(r.origin_code),
      destCode: String(r.dest_code), routing: String(r.routing), note: String(r.note), rank: Number(r.rank),
    }));
  }
  async glossary() {
    const { results } = await this.db.prepare('SELECT * FROM glossary ORDER BY term').all<Row>();
    return results.map((r) => ({
      term: String(r.term), aliases: parse<string[]>(r.aliases, []), explanation: String(r.explanation),
    }));
  }
  async createTrip(id: string, t: TripInput, now: string) {
    await this.db
      .prepare(
        `INSERT INTO trips (id, origin, dest, species, arrival_date, pet_name, snub_nosed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, t.origin, t.dest, t.species, t.arrivalDate, t.petName ?? null, t.snubNosed ? 1 : 0, now, now)
      .run();
  }
  async updateTrip(id: string, t: TripInput, now: string) {
    await this.db
      .prepare(
        `UPDATE trips SET origin = ?, dest = ?, species = ?, arrival_date = ?, pet_name = ?, snub_nosed = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(t.origin, t.dest, t.species, t.arrivalDate, t.petName ?? null, t.snubNosed ? 1 : 0, now, id)
      .run();
  }
  async trip(id: string): Promise<Trip | null> {
    const r = await this.db.prepare('SELECT * FROM trips WHERE id = ?').bind(id).first<Row>();
    if (!r) return null;
    const { results } = await this.db
      .prepare('SELECT requirement_id FROM trip_tasks WHERE trip_id = ? AND done = 1').bind(id).all<Row>();
    return {
      id: String(r.id), origin: String(r.origin), dest: String(r.dest),
      species: r.species as Trip['species'], arrivalDate: String(r.arrival_date),
      petName: opt(r.pet_name), snubNosed: Boolean(r.snub_nosed), createdAt: String(r.created_at),
      doneIds: results.map((x) => String(x.requirement_id)),
    };
  }
  async setTaskDone(tripId: string, reqId: string, done: boolean, now: string) {
    if (done) {
      await this.db
        .prepare(
          `INSERT INTO trip_tasks (trip_id, requirement_id, done, done_at) VALUES (?, ?, 1, ?)
           ON CONFLICT(trip_id, requirement_id) DO UPDATE SET done = 1, done_at = excluded.done_at`,
        )
        .bind(tripId, reqId, now).run();
    } else {
      await this.db.prepare('DELETE FROM trip_tasks WHERE trip_id = ? AND requirement_id = ?').bind(tripId, reqId).run();
    }
    await this.db.prepare('UPDATE trips SET updated_at = ? WHERE id = ?').bind(now, tripId).run();
  }
}

export interface SeedData {
  countries: Country[];
  countryGroups: CountryGroup[];
  requirements: Requirement[];
  airlines: Airline[];
  airlineRoutes: AirlineRoute[];
  glossary: GlossaryTerm[];
}

export class MemoryStore implements Store {
  private trips = new Map<string, Trip>();
  constructor(private seed: SeedData) {}
  async countries() { return [...this.seed.countries].sort((a, b) => a.name.localeCompare(b.name)); }
  async country(code: string) { return this.seed.countries.find((c) => c.code === code) ?? null; }
  async groups(destCode: string) { return this.seed.countryGroups.filter((g) => g.destCode === destCode); }
  async requirementsFor(originCode: string, destCode: string) {
    return this.seed.requirements.filter(
      (r) =>
        (r.direction === 'import' && r.countryCode === destCode) ||
        (r.direction === 'export' && r.countryCode === originCode) ||
        r.direction === 'general',
    );
  }
  async airlines() { return this.seed.airlines; }
  async airlineRoutes(o: string, d: string) {
    return this.seed.airlineRoutes.filter((r) => r.originCode === o && r.destCode === d);
  }
  async glossary() { return this.seed.glossary; }
  async createTrip(id: string, t: TripInput, now: string) { this.trips.set(id, { ...t, id, createdAt: now, doneIds: [] }); }
  async updateTrip(id: string, t: TripInput) {
    const trip = this.trips.get(id);
    if (trip) this.trips.set(id, { ...trip, ...t });
  }
  async trip(id: string) { const t = this.trips.get(id); return t ? { ...t, doneIds: [...t.doneIds] } : null; }
  async setTaskDone(tripId: string, reqId: string, done: boolean) {
    const t = this.trips.get(tripId);
    if (!t) return;
    t.doneIds = t.doneIds.filter((x) => x !== reqId);
    if (done) t.doneIds.push(reqId);
  }
}
