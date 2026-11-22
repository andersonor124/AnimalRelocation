import { useEffect, useMemo, useState } from 'react';
import type { TripInput } from './planner.ts';
import { getCountries, getGlossary, local, makePlan } from './planner.ts';
import { mergeDone, parsePlanQuery, planQuery, progressKey } from './share.ts';
import { GlossaryContext } from './components/GlossaryText.tsx';
import { PlanView } from './components/PlanView.tsx';
import { TripForm } from './components/TripForm.tsx';

const RECENT_KEY = 'petpassage:recent';
interface RecentPlan {
  query: string;
  label: string;
}

/** The page shows a plan whenever the web address has ?from=…&to=… in it. */
function go(query: string) {
  history.pushState(null, '', query || location.pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

export function App() {
  const countries = useMemo(getCountries, []);
  const glossary = useMemo(getGlossary, []);
  const [search, setSearch] = useState(location.search);
  const [editing, setEditing] = useState(false);
  const [recent, setRecent] = useState<RecentPlan[]>(() => local.get<RecentPlan[]>(RECENT_KEY, []));
  const [doneIds, setDoneIds] = useState<string[]>([]);

  useEffect(() => {
    const onPop = () => setSearch(location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const parsed = useMemo(() => parsePlanQuery(search), [search]);
  const input = parsed?.input ?? null;

  // Load this device's progress for the trip, plus any ticks carried in a shared link.
  useEffect(() => {
    setEditing(false);
    if (!parsed) return;
    const merged = mergeDone(local.get<string[]>(progressKey(parsed.input), []), parsed.sharedDone);
    local.set(progressKey(parsed.input), merged);
    setDoneIds(merged);
    if (parsed.sharedDone.length) {
      // Tidy the address bar so ticking later doesn't look out of sync with the link.
      history.replaceState(null, '', planQuery(parsed.input));
    }
  }, [parsed]);

  const plan = useMemo(() => (input ? makePlan(input, doneIds) : null), [input, doneIds]);
  const badLink = !plan && new URLSearchParams(search).has('from');

  // Remember recently viewed plans for the home page.
  useEffect(() => {
    if (!plan || !input) return;
    const query = planQuery(input);
    const label = `${input.petName ? input.petName + ': ' : ''}${plan.origin.name} → ${plan.dest.name} (${plan.arrivalDate})`;
    setRecent((prev) => {
      const next = [{ query, label }, ...prev.filter((r) => r.query !== query)].slice(0, 10);
      local.set(RECENT_KEY, next);
      return next;
    });
  }, [plan?.origin.code, plan?.dest.code, input]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = plan ? `${plan.origin.name} → ${plan.dest.name} · PetPassage` : 'PetPassage';
  }, [plan]);

  const onToggle = (id: string, done: boolean) => {
    if (!input) return;
    const next = done ? mergeDone(doneIds, [id]) : doneIds.filter((x) => x !== id);
    local.set(progressKey(input), next);
    setDoneIds(next);
  };

  const onSubmitTrip = (t: TripInput) => go(planQuery(t));

  return (
    <GlossaryContext.Provider value={glossary}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header no-print">
        <a
          href="./"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go('');
          }}
        >
          <span aria-hidden>🐾</span> PetPassage
        </a>
        <span className="tagline">Moving abroad with your pet, step by step</span>
      </header>

      <main id="main">
        {badLink && (
          <div className="alert alert-danger" role="alert">
            <strong>That link looks incomplete</strong>
            <p>Some trip details are missing or invalid. Fill in the form below to make a new plan.</p>
          </div>
        )}

        {!plan && (
          <>
            <section className="intro">
              <h1>Moving countries with your cat or dog?</h1>
              <p>
                Tell us where you’re going and when. We’ll turn the confusing government rules into a simple, dated checklist — in plain
                English — and show which airlines can fly your pet.
              </p>
              <ul className="promises">
                <li>✅ Every step, in the right order</li>
                <li>📅 Real deadlines worked out from your arrival date</li>
                <li>✈️ Airlines that can actually take your pet</li>
                <li>💸 Free, no account needed</li>
              </ul>
            </section>
            <TripForm countries={countries} onSubmit={onSubmitTrip} />
            {recent.length > 0 && (
              <section className="saved card soft">
                <h2>Your plans on this device</h2>
                <ul>
                  {recent.map((r) => (
                    <li key={r.query}>
                      <a
                        href={r.query}
                        onClick={(e) => {
                          e.preventDefault();
                          go(r.query);
                        }}
                      >
                        {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {plan && input && (
          <>
            {editing && <TripForm countries={countries} initial={input} submitLabel="Update my plan" onSubmit={onSubmitTrip} />}
            <PlanView
              plan={plan}
              input={input}
              onToggle={onToggle}
              onEdit={() => {
                setEditing((e) => !e);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </main>

      <footer className="site-footer">
        <p>
          PetPassage gives general guidance based on official government and airline sources. Rules change often — always confirm
          with the official authority, your airline and your vet. Not legal or veterinary advice.
        </p>
      </footer>
    </GlossaryContext.Provider>
  );
}
