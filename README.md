# 🐾 PetPassage

A free web app that helps owners move a **cat or dog to another country**. Pick where you're flying from and to, your pet and your arrival date. PetPassage then gives you:

- **A personalised, dated checklist.** Every step (microchip, vaccines, permits, vet certificates, government endorsement, booking) is listed in the right order, with "start by" and "finish by" dates worked out from your arrival day. Steps that must happen inside a strict window, such as a health certificate within 14 days of departure, are flagged.
- **Plain-English explanations.** Each step answers *What*, *Why it matters*, *How to do it* and *Rough cost*, and links to the official source. Jargon words such as *RNATT*, *endorse* and *manifest cargo* can be tapped for an explanation.
- **A "too soon?" check.** If your date can't work (for example, Australia's 180-day wait after the rabies blood test), the app tells you the earliest realistic arrival date.
- **Airline options.** It shows which airlines can carry your pet on that route and how (cabin, checked baggage or cargo), including snub-nosed breed limits and summer heat embargoes. It also lists the airlines that *won't* work and why.
- **Progress tracking.** You can tick steps off (they're remembered on your device), copy a link that carries your plan and progress to another device, add every deadline to your calendar (.ics), or print the plan.

Launch countries are **Canada, Hong Kong, United States, United Kingdom, European Union, Australia, Singapore and Japan**, in any direction. The Canada → Hong Kong route has been reviewed most closely.

> ⚠️ PetPassage gives general guidance. Rules change, so always confirm with the official authority, your airline and your vet. Each step shows when it was last reviewed and how confident we are in it.

## How it's built: no backend, no accounts, free

The whole app runs in the visitor's browser. The rules are plain files in this repo, and GitHub Pages hosts the site for free.

```
data/       All content: countries, rules for each country, airlines, glossary (edit these)
engine/     The planning logic: builds the dated timeline, filters airlines, makes .ics files
shared/     Types used by everything
web/        React app (wizard, timeline, airline list, glossary)
tests/      Vitest tests for the planning logic and share links
.github/workflows/deploy.yml   Builds, tests and publishes to GitHub Pages on every push
```

**Where is my progress saved?** In your browser's storage on that device. To continue on another device, use **Copy link**. The link contains the trip details and the steps ticked *at the moment you copied it*. Opening it adds those ticks to that device.

### How the timeline is worked out

Each rule in `data/` says:
- `deadlineDays`: the step must be finished at least this many days before arrival.
- `windowDays`: the step can't be done earlier than this, e.g. a certificate valid for only 14 days.
- `durationDays`: processing or waiting time.
- `dependsOn` + `gapDays`: for example, the blood test comes at least 21 days after the rabies vaccine.
- `appliesIf`: which origin groups, species or breeds it applies to.

`engine/buildPlan.ts` picks the rules for your route and works forwards ("earliest you can do it") and backwards ("latest you can do it so later steps still fit"). It then recommends a start date and flags anything that can't fit. Only *required* steps can make a date impossible; *recommended* steps just become "do this now".

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

## Put it online (one-time, free)

1. On GitHub, open the repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push any change, or open **Actions → Deploy to GitHub Pages → Run workflow**.

The site appears at **https://andersonor124.github.io/AnimalRelocation/** and updates by itself about a minute after every push.

If the deploy step says the branch isn't allowed to deploy, go to **Settings → Environments → github-pages → Deployment branches** and add the branch, or merge it into `main`.

## Updating rules or adding a country

- **Change a rule:** edit the step in `data/import-*.ts`, `data/exports.ts` or `data/general.ts` and push. The site updates automatically.
- **Add a country:**
  1. Add it to `countries` in `data/countries.ts`, with how the destination classifies every origin in `countryGroups`.
  2. Add its entry rules in a new `data/import-xx.ts` and its exit endorsement step in `data/exports.ts`.
  3. Add it to the `serves` list of airlines that fly there in `data/airlines.ts`.
  4. Run `npm test`. A test checks that every route has a classification and a workable plan.

Set `verification` honestly on every step: `official` (checked on the official page), `reviewed` (checked against official sources) or `general` (general guidance, needs confirming). Update `LAST_CHECKED` in `data/helpers.ts` when you review content.
