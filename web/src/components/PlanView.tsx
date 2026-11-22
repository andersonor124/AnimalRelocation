import { useMemo, useState } from 'react';
import type { Plan, TripInput } from '../planner.ts';
import { downloadCalendar, getAirlines } from '../planner.ts';
import { planQuery } from '../share.ts';
import { fmtDate, relDays } from '../format.ts';
import { AirlineList } from './AirlineList.tsx';
import { GlossaryList } from './GlossaryList.tsx';
import { Timeline } from './Timeline.tsx';

type Tab = 'timeline' | 'airlines' | 'glossary';

interface Props {
  plan: Plan;
  input: TripInput;
  onToggle: (id: string, done: boolean) => void;
  onEdit: () => void;
}

export function PlanView({ plan, input, onToggle, onEdit }: Props) {
  const [tab, setTab] = useState<Tab>('timeline');
  const [copied, setCopied] = useState(false);
  const airlines = useMemo(() => getAirlines(input), [input]);

  const done = plan.tasks.filter((t) => t.done).length;
  const pct = plan.tasks.length ? Math.round((done / plan.tasks.length) * 100) : 0;
  const next = plan.tasks.find((t) => !t.done && t.critical) ?? plan.tasks.find((t) => !t.done);
  const pet = input.petName || `your ${input.species}`;
  // The link carries the plan and the ticks made so far, so it can be opened on another device.
  const shareUrl = `${location.origin}${location.pathname}${planQuery(
    input,
    plan.tasks.filter((t) => t.done).map((t) => t.id),
  )}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is visible to copy manually */
    }
  };

  return (
    <div className="plan">
      <header className="plan-hero card">
        <p className="eyebrow">
          {plan.origin.flag} {plan.origin.name} → {plan.dest.flag} {plan.dest.name} · {input.species === 'cat' ? '🐈 Cat' : '🐕 Dog'}
        </p>
        <h1>
          {input.petName ? `${input.petName}’s` : `Your ${input.species}’s`} move plan
        </h1>
        <div className="stats">
          <div className="stat">
            <span className="stat-num">{plan.daysToArrival >= 0 ? plan.daysToArrival : '—'}</span>
            <span className="stat-label">days until arrival ({fmtDate(plan.arrivalDate)})</span>
          </div>
          <div className="stat">
            <span className="stat-num">
              {done}/{plan.tasks.length}
            </span>
            <span className="stat-label">steps done</span>
          </div>
          <div className="stat">
            <span className="stat-num">{plan.tasks.filter((t) => !t.done && t.critical).length}</span>
            <span className="stat-label">required steps left</span>
          </div>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
          <span style={{ width: `${pct}%` }} />
        </div>
        {next && (
          <p className="next-up">
            <strong>Next up:</strong> {next.title} — {next.startBy === next.dueDate ? `on ${fmtDate(next.dueDate)}` : `start ${relDays(Math.max(0, daysFromToday(plan.today, next.startBy)))}`}
            .
          </p>
        )}
        <div className="actions no-print">
          <div className="share">
            <span className="share-label">
              Your progress is saved on this device. To open it on your phone or share it, copy this link — it includes the steps
              ticked so far.
            </span>
            <div className="share-row">
              <input readOnly value={shareUrl} aria-label="Link to this plan with your progress" onFocus={(e) => e.target.select()} />
              <button className="btn primary" type="button" onClick={copy}>
                {copied ? 'Copied ✓' : '🔗 Copy link'}
              </button>
            </div>
          </div>
          <button className="btn" type="button" onClick={() => downloadCalendar(plan, input.petName)}>
            📅 Add to calendar
          </button>
          <button className="btn" type="button" onClick={() => window.print()}>
            🖨️ Print
          </button>
          <button className="btn ghost" type="button" onClick={onEdit}>
            ✏️ Change trip
          </button>
        </div>
      </header>

      <div className="warnings">
        {plan.warnings.map((w) => (
          <div key={w.title} className={`alert alert-${w.level}`} role={w.level === 'danger' ? 'alert' : undefined}>
            <strong>{w.title}</strong>
            <p>{w.message}</p>
          </div>
        ))}
      </div>

      <nav className="tabs no-print" role="tablist" aria-label="Plan sections">
        {(
          [
            ['timeline', '🗓️ Timeline & tasks'],
            ['airlines', '✈️ Airlines'],
            ['glossary', '📖 Words explained'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="tab-panel">
        {tab === 'timeline' && <Timeline plan={plan} onToggle={onToggle} />}
        {tab === 'airlines' && <AirlineList plan={plan} data={airlines} />}
        {tab === 'glossary' && <GlossaryList />}
      </div>
      <p className="fineprint">
        Planning for {pet}. Hover or tap underlined words for a plain-English explanation.
      </p>
    </div>
  );
}

function daysFromToday(today: string, iso: string) {
  return Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
}
