import { useState } from 'react';
import type { AirlineOption, Plan } from '../planner.ts';
import { GlossaryText } from './GlossaryText.tsx';

const MODE: Record<string, { icon: string; label: string; explain: string }> = {
  cabin: { icon: '💺', label: 'In the cabin', explain: 'Small pets ride with you under the seat in front, in a soft carrier.' },
  checked: { icon: '🧳', label: 'Checked baggage', explain: 'Your pet flies in the hold of your flight; you check it in at the passenger desk.' },
  cargo: { icon: '📦', label: 'Cargo', explain: 'Your pet flies in a climate-controlled hold as a separate shipment, booked through the airline’s cargo team or an agent.' },
};

export function AirlineList({ plan, data }: { plan: Plan; data: { suitable: AirlineOption[]; unsuitable: AirlineOption[] } | null }) {
  const [showOther, setShowOther] = useState(false);
  if (!data) return <p className="loading">Loading airlines…</p>;
  return (
    <section aria-label="Airline options">
      <div className="modes card soft">
        <h3>How can a pet fly?</h3>
        <ul>
          {Object.entries(MODE).map(([k, m]) => (
            <li key={k} className={plan.dest.acceptedModes.includes(k as never) ? '' : 'muted'}>
              <span aria-hidden>{m.icon}</span>
              <div>
                <strong>{m.label}</strong>
                {!plan.dest.acceptedModes.includes(k as never) && <em> — not allowed into {plan.dest.name}</em>}
                <p>{m.explain}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {data.suitable.length === 0 && <p className="empty">We don’t have airline data for this route yet. A pet relocation agent can find options.</p>}
      <ul className="airlines">
        {data.suitable.map((a) => (
          <AirlineCard key={a.code} a={a} />
        ))}
      </ul>

      {data.unsuitable.length > 0 && (
        <div className="unsuitable">
          <button type="button" className="link" aria-expanded={showOther} onClick={() => setShowOther((s) => !s)}>
            {showOther ? 'Hide' : 'Show'} {data.unsuitable.length} airline{data.unsuitable.length > 1 ? 's' : ''} that won’t work for this trip
          </button>
          {showOther && (
            <ul className="airlines">
              {data.unsuitable.map((a) => (
                <AirlineCard key={a.code} a={a} />
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="fineprint">
        Airline pet policies change often and depend on aircraft and season. Always confirm with the airline before booking. We
        don’t sell tickets and aren’t paid by any airline.
      </p>
    </section>
  );
}

function AirlineCard({ a }: { a: AirlineOption }) {
  const notes = [
    ['Cabin', a.cabinNote],
    ['Cargo', a.cargoNote],
    ['Heat & breeds', a.heatNote],
    ['Crate', a.crateNote],
  ].filter(([, v]) => v) as [string, string][];
  return (
    <li className={`airline card ${a.usableModes.length ? '' : 'blocked'}`}>
      <div className="airline-head">
        <div>
          <h3>{a.name}</h3>
          <p className="hub">Hub: {a.hub}</p>
        </div>
        <div className="mode-badges">
          {a.usableModes.map((m) => (
            <span key={m} className="pill pill-mode">
              {MODE[m].icon} {MODE[m].label}
            </span>
          ))}
        </div>
      </div>
      {a.route && (
        <div className="route-note">
          <strong>✈︎ {a.route.routing}</strong>
          <p>{a.route.note}</p>
        </div>
      )}
      <p>
        <GlossaryText text={a.summary} />
      </p>
      {a.warnings.map((w) => (
        <p key={w} className="warn-line">
          ⚠️ {w}
        </p>
      ))}
      {notes.length > 0 && (
        <dl className="airline-notes">
          {notes.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>
                <GlossaryText text={v} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="tip">
        <span aria-hidden>💡</span> {a.bookingTip}
      </p>
      <p className="task-foot">
        <a href={a.policyUrl} target="_blank" rel="noreferrer">
          Airline pet policy ↗
        </a>
        <span className={`verify verify-${a.verification}`}>
          {a.verification === 'general' ? 'General guidance — confirm with the airline' : 'Reviewed against the airline’s pages'}
        </span>
      </p>
    </li>
  );
}
