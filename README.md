# 🐾 PetPassage

A free web app that helps owners move a **cat or dog to another country**. Pick where you're flying from and to, your pet and your arrival date. PetPassage then gives you:

- **A personalised, dated checklist.** Every step (microchip, vaccines, permits, vet certificates, government endorsement, booking) appears in the right order, with "start by" and "finish by" dates worked out from your arrival day. Steps that must happen inside a strict window, such as a health certificate within 14 days of departure, are flagged.
- **Plain-English explanations.** Each step answers *What*, *Why it matters*, *How to do it*, *Rough cost* and links to the official source. Jargon words such as *RNATT*, *endorse* and *manifest cargo* can be tapped for an explanation.
- **A "too soon?" check.** If your date can't work (for example, Australia's 180-day wait after the rabies blood test), the app tells you the earliest realistic arrival date.
- **Airline options.** The app shows which airlines can carry your pet on that route and how: in the cabin, as checked baggage or as cargo. It also covers snub-nosed breed limits and summer heat embargoes, and lists the airlines that *won't* work and why.
- **Progress tracking.** You can tick steps off, save the plan to a private link (no account needed), add every deadline to your calendar (.ics) or print it.

Launch countries are **Canada, Hong Kong, United States, United Kingdom, European Union, Australia, Singapore and Japan**, in any direction. The Canada → Hong Kong route has been reviewed most closely.

> ⚠️ PetPassage gives general guidance. Rules change, so always confirm with the official authority, your airline and your vet. Each step shows when its rule was last reviewed and how confident we are in it.

## How it's built (100% free to run)

| Part | Technology | Free tier |
|---|---|---|
| Frontend | React + TypeScript (Vite) in `web/` | Cloudflare Pages: unlimited static requests |
| Backend API | [Hono](https://hono.dev) on Cloudflare Pages Functions (`functions/`, `server/`) | 100,000 requests/day |
| Database | Cloudflare D1 (SQLite) | 5 GB storage, 5M reads/day |

```
web/            React app (wizard, timeline, airline list, glossary)
functions/api/  Pages Function that mounts the API at /api/*
server/         API routes (app.ts), D1 data access (store.ts), planning engine (engine/)
shared/         Types shared by frontend and backend
db/schema.sql   Database tables
db/seed/        All rules, countries, airlines and glossary, written as readable TypeScript
db/generated/   seed.sql generated from db/seed (npm run seed:build)
tests/          Vitest tests for the engine and the API
```

### How the timeline is worked out

Each rule in the `requirements` table says:
- `deadline_days`: the step must be finished at least this many days before arrival.
- `window_days`: the step can't be done earlier than this, e.g. a certificate valid for only 14 days.
- `duration_days`: processing or waiting time.
- `depends_on` + `gap_days`: for example, the blood test comes at least 21 days after the rabies vaccine.
- `applies_if`: which origin groups, species or breeds the rule applies to.

`server/engine/buildPlan.ts` picks the rules for your route and works forwards ("earliest you can do it") and backwards ("latest you can do it so later steps still fit"). It then recommends a start date and flags anything that can't fit. Only *required* steps can make a date impossible; *recommended* steps just become "do this now".

## Run it locally

```bash
npm install
```

```bash
npm run db:reset
```

```bash
npm start
```

`npm run db:reset` creates a local D1 database and loads the seed data. `npm start` builds the app and serves it with the API at http://localhost:8788.

For hot-reloading UI work, run `npm run dev:api` in one terminal and `npm run dev` in another (Vite proxies `/api` to wrangler).

```bash
npm test
```

```bash
npm run typecheck
```

## Deploy for free on Cloudflare (one-time setup)

**No command line?** Use the dashboard instead. Create the D1 database `petpassage` in the Cloudflare dashboard, open its **Console**, paste the whole of [`db/setup-all.sql`](db/setup-all.sql) and run it. Then connect the repo as in step 4 below. Regenerate that file with `npm run setup-sql` whenever the seed data changes.

**With the command line:**

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up (no credit card needed).
2. Log in and create the database:
   ```bash
   npx wrangler login
   ```
   ```bash
   npx wrangler d1 create petpassage
   ```
   Paste the `database_id` it prints into `wrangler.toml`.
3. Load the tables and data into the real database:
   ```bash
   npm run db:reset:remote
   ```
4. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git**, pick this repository and set:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. In the Pages project open **Settings → Bindings → Add → D1 database**, set the variable name to `DB` and choose `petpassage`.

Every push to the connected branch now redeploys automatically.

## Updating rules or adding a country

All content lives in `db/seed/`:

- **Change a rule:** edit the step in `db/seed/import-*.ts` (or `exports.ts` / `general.ts`), then run `npm run db:seed:remote` (or `npm run db:reset` locally). No app rebuild is needed.
- **Add a country:**
  1. Add it to `countries` in `db/seed/countries.ts`, with the destination's classification of every origin in `countryGroups`.
  2. Add its import steps in a new `db/seed/import-xx.ts` and its export endorsement step in `exports.ts`.
  3. Add it to the `serves` list of airlines that fly there in `airlines.ts`.
  4. Run `npm test`. The integrity test checks that every route has a classification and a workable plan.

Set `verification` honestly on every step: `official` (checked on the official page), `reviewed` (checked against official sources), or `general` (general guidance, needs confirming). Update `LAST_CHECKED` in `db/seed/helpers.ts` when you review content.
