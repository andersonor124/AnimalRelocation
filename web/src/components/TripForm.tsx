import { useMemo, useState } from 'react';
import type { Country, TripInput } from '../api.ts';
import { localToday } from '../api.ts';

interface Props {
  countries: Country[];
  initial?: Partial<TripInput>;
  submitLabel?: string;
  onSubmit: (t: TripInput) => void;
  busy?: boolean;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function TripForm({ countries, initial, submitLabel = 'Build my plan', onSubmit, busy }: Props) {
  const [origin, setOrigin] = useState(initial?.origin ?? 'CA');
  const [dest, setDest] = useState(initial?.dest ?? 'HK');
  const [species, setSpecies] = useState<TripInput['species']>(initial?.species ?? 'cat');
  const [petName, setPetName] = useState(initial?.petName ?? '');
  const [snubNosed, setSnubNosed] = useState(initial?.snubNosed ?? false);
  const [arrivalDate, setArrivalDate] = useState(initial?.arrivalDate ?? addDays(localToday(), 120));
  const [error, setError] = useState('');

  const destCountry = useMemo(() => countries.find((c) => c.code === dest), [countries, dest]);
  const slowDest = dest === 'AU' || dest === 'JP';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin === dest) return setError('Pick two different places.');
    if (!arrivalDate) return setError('Pick the date your pet will arrive.');
    setError('');
    onSubmit({ origin, dest, species, arrivalDate, petName: petName.trim() || undefined, snubNosed });
  };

  return (
    <form className="trip-form card" onSubmit={submit} aria-label="Plan your pet's move">
      <fieldset className="step">
        <legend>
          <span className="step-num">1</span> Where is your pet moving?
        </legend>
        <div className="route-row">
          <label className="field">
            <span>Flying from</span>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} name="origin">
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="swap"
            aria-label="Swap origin and destination"
            onClick={() => {
              setOrigin(dest);
              setDest(origin);
            }}
          >
            ⇄
          </button>
          <label className="field">
            <span>Flying to</span>
            <select value={dest} onChange={(e) => setDest(e.target.value)} name="dest">
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {destCountry && origin !== dest && <p className="hint">{destCountry.importSummary}</p>}
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-num">2</span> Tell us about your pet
        </legend>
        <div className="species-row" role="radiogroup" aria-label="Type of pet">
          {(['cat', 'dog'] as const).map((s) => (
            <label key={s} className={`species ${species === s ? 'on' : ''}`}>
              <input type="radio" name="species" value={s} checked={species === s} onChange={() => setSpecies(s)} />
              <span className="species-emoji" aria-hidden>
                {s === 'cat' ? '🐈' : '🐕'}
              </span>
              <span>{s === 'cat' ? 'Cat' : 'Dog'}</span>
            </label>
          ))}
        </div>
        <label className="field">
          <span>Pet’s name (optional)</span>
          <input value={petName} maxLength={40} onChange={(e) => setPetName(e.target.value)} placeholder="e.g. Mochi" name="petName" />
        </label>
        <label className="check">
          <input type="checkbox" checked={snubNosed} onChange={(e) => setSnubNosed(e.target.checked)} name="snubNosed" />
          <span>
            My pet is a flat-faced (snub-nosed) breed
            <small>e.g. Persian, Himalayan, Exotic Shorthair, Pug, French Bulldog, Boxer — airlines have extra rules for these.</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-num">3</span> When will your pet arrive?
        </legend>
        <label className="field">
          <span>Arrival date at the destination</span>
          <input type="date" value={arrivalDate} min={localToday()} onChange={(e) => setArrivalDate(e.target.value)} name="arrivalDate" required />
        </label>
        <p className="hint">
          {slowDest
            ? `Heads up: moving to ${destCountry?.name} from most countries takes 7+ months because of a rabies blood test and a 180-day wait. Not sure yet? Pick your ideal date — we’ll tell you the earliest realistic one.`
            : 'Most moves need about 2–4 months of preparation. Not sure yet? Pick your ideal date — we’ll tell you if it’s too soon.'}
        </p>
      </fieldset>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary big" type="submit" disabled={busy}>
        {busy ? 'Working…' : submitLabel}
      </button>
    </form>
  );
}
