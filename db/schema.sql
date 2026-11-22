-- PetPassage database schema (Cloudflare D1 / SQLite).
-- Running this file resets the reference tables; trips are kept.

-- Children before parents, so foreign keys don't block the drops.
DROP TABLE IF EXISTS airline_routes;
DROP TABLE IF EXISTS airlines;
DROP TABLE IF EXISTS country_groups;
DROP TABLE IF EXISTS requirements;
DROP TABLE IF EXISTS glossary;
DROP TABLE IF EXISTS countries;

CREATE TABLE countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT NOT NULL,
  rabies_status TEXT NOT NULL CHECK (rabies_status IN ('free', 'controlled', 'high')),
  authority_name TEXT NOT NULL,
  authority_url TEXT NOT NULL,
  import_summary TEXT NOT NULL,
  quarantine_note TEXT NOT NULL,
  accepted_modes TEXT NOT NULL,          -- JSON array
  pet_airports TEXT NOT NULL
);

CREATE TABLE country_groups (
  dest_code TEXT NOT NULL REFERENCES countries(code),
  origin_code TEXT NOT NULL REFERENCES countries(code),
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (dest_code, origin_code)
);

CREATE TABLE requirements (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,            -- '*' for steps on every route
  direction TEXT NOT NULL CHECK (direction IN ('import', 'export', 'general')),
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog', 'both')),
  applies_if TEXT,                       -- JSON object or NULL
  deadline_days INTEGER NOT NULL,
  window_days INTEGER,
  duration_days INTEGER NOT NULL DEFAULT 0,
  depends_on TEXT NOT NULL DEFAULT '[]', -- JSON array of requirement ids
  gap_days INTEGER NOT NULL DEFAULT 0,
  critical INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  what TEXT NOT NULL,
  why TEXT NOT NULL,
  how TEXT NOT NULL,
  tip TEXT,
  est_cost TEXT,
  official_url TEXT,
  verification TEXT NOT NULL,
  last_checked TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE INDEX idx_requirements_country ON requirements(country_code);

CREATE TABLE airlines (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  policy_url TEXT NOT NULL,
  modes TEXT NOT NULL,                   -- JSON array
  serves TEXT NOT NULL,                  -- JSON array of country codes
  hub TEXT NOT NULL,
  snub_nosed TEXT NOT NULL,
  summary TEXT NOT NULL,
  cabin_note TEXT,
  cargo_note TEXT,
  heat_note TEXT,
  crate_note TEXT,
  booking_tip TEXT NOT NULL,
  verification TEXT NOT NULL,
  last_checked TEXT NOT NULL
);

CREATE TABLE airline_routes (
  airline_code TEXT NOT NULL REFERENCES airlines(code),
  origin_code TEXT NOT NULL,
  dest_code TEXT NOT NULL,
  routing TEXT NOT NULL,
  note TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 100,
  PRIMARY KEY (airline_code, origin_code, dest_code)
);

CREATE TABLE glossary (
  term TEXT PRIMARY KEY,
  aliases TEXT NOT NULL,                 -- JSON array
  explanation TEXT NOT NULL
);

-- Saved trips (private link, no login).
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  dest TEXT NOT NULL,
  species TEXT NOT NULL,
  arrival_date TEXT NOT NULL,
  pet_name TEXT,
  snub_nosed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_tasks (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 1,
  done_at TEXT NOT NULL,
  PRIMARY KEY (trip_id, requirement_id)
);
