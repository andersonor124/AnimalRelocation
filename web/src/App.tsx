import { useCallback, useEffect, useState } from 'react';
import type { Country, GlossaryTerm, Plan, TripInput } from './api.ts';
import { api, local, tripQuery } from './api.ts';
import { GlossaryContext } from './components/GlossaryText.tsx';
import { PlanView } from './components/PlanView.tsx';
import { TripForm } from './components/TripForm.tsx';

type Route = { name: 'home' } | { name: 'plan'; input: TripInput } | { name: 'trip'; id: string };

function readRoute(): Route {
  const path = location.pathname;
  const trip = /^\/trip\/([A-Za-z0-9_-]{10,})$/.exec(path);
  if (trip) return { name: 'trip', id: trip[1] };
  if (path === '/plan') {
    const p = new URLSearchParams(location.search);
    const species = p.get('species');
    if (p.get('from') && p.get('to') && p.get('arrival') && (species === 'cat' || species === 'dog')) {
      return {
        name: 'plan',
        input: {
          origin: p.get('from')!,
          dest: p.get('to')!,
          species,
          arrivalDate: p.get('arrival')!,
          snubNosed: p.get('snub') === '1',
          petName: p.get('name') ?? undefined,
        },
      };
    }
  }
  return { name: 'home' };
}

function go(url: string) {
  history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

const doneKey = (t: TripInput) => `petpassage:done:${t.origin}-${t.dest}-${t.species}`;
const SAVED_KEY = 'petpassage:saved';

interface SavedTrip {
  id: string;
  label: string;
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [countries, setCountries] = useState<Country[]>([]);
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [input, setInput] = useState<TripInput | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedTrip[]>(() => local.get<SavedTrip[]>(SAVED_KEY, []));

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    api.countries().then(setCountries, (e: Error) => setError(e.message));
    api.glossary().then(setGlossary, () => undefined);
  }, []);

  const load = useCallback(async (r: Route) => {
    setError('');
    setEditing(false);
    try {
      if (r.name === 'plan') {
        setInput(r.input);
        setPlan(await api.plan(r.input, local.get<string[]>(doneKey(r.input), [])));
      } else if (r.name === 'trip') {
        const { trip, plan } = await api.trip(r.id);
        setInput(trip);
        setPlan(plan);
      } else {
        setPlan(null);
      }
    } catch (e) {
      setPlan(null);
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load(route);
  }, [route, load]);

  useEffect(() => {
    document.title = plan ? `${plan.origin.name} → ${plan.dest.name} · PetPassage` : 'PetPassage';
  }, [plan]);

  const tripId = route.name === 'trip' ? route.id : undefined;

  const onToggle = async (id: string, done: boolean) => {
    if (!plan || !input) return;
    // Optimistic update so the checkbox responds instantly.
    setPlan({ ...plan, tasks: plan.tasks.map((t) => (t.id === id ? { ...t, done, status: done ? 'done' : t.status } : t)) });
    try {
      if (tripId) {
        await api.setDone(tripId, id, done);
        setPlan((await api.trip(tripId)).plan);
      } else {
        const ids = new Set(local.get<string[]>(doneKey(input), []));
        if (done) ids.add(id);
        else ids.delete(id);
        local.set(doneKey(input), [...ids]);
        setPlan(await api.plan(input, [...ids]));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onSave = async () => {
    if (!input || !plan) return;
    setSaving(true);
    try {
      const { id } = await api.createTrip(input);
      await Promise.all(plan.tasks.filter((t) => t.done).map((t) => api.setDone(id, t.id, true)));
      const label = `${input.petName ? input.petName + ': ' : ''}${plan.origin.name} → ${plan.dest.name}`;
      const next = [{ id, label }, ...saved.filter((s) => s.id !== id)].slice(0, 10);
      setSaved(next);
      local.set(SAVED_KEY, next);
      go(`/trip/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onSubmitTrip = async (t: TripInput) => {
    if (tripId) {
      try {
        await api.updateTrip(tripId, t);
        await load(route);
      } catch (e) {
        setError((e as Error).message);
      }
    } else {
      go(`/plan?${tripQuery(t)}`);
    }
  };

  return (
    <GlossaryContext.Provider value={glossary}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header no-print">
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go('/');
          }}
        >
          <span aria-hidden>🐾</span> PetPassage
        </a>
        <span className="tagline">Moving abroad with your pet, step by step</span>
      </header>

      <main id="main">
        {error && (
          <div className="alert alert-danger" role="alert">
            <strong>Something needs attention</strong>
            <p>{error}</p>
          </div>
        )}

        {route.name === 'home' && (
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
            {countries.length > 0 ? <TripForm countries={countries} onSubmit={onSubmitTrip} /> : !error && <p className="loading">Loading…</p>}
            {saved.length > 0 && (
              <section className="saved card soft">
                <h2>Your saved plans</h2>
                <ul>
                  {saved.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`/trip/${s.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          go(`/trip/${s.id}`);
                        }}
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {route.name !== 'home' && plan && input && (
          <>
            {editing && countries.length > 0 && (
              <TripForm countries={countries} initial={input} submitLabel="Update my plan" onSubmit={onSubmitTrip} />
            )}
            <PlanView
              plan={plan}
              input={input}
              tripId={tripId}
              saving={saving}
              onToggle={onToggle}
              onSave={onSave}
              onEdit={() => {
                setEditing((e) => !e);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
        {route.name !== 'home' && !plan && !error && <p className="loading">Building your plan…</p>}
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
