import { useState } from 'react';
import type { Plan } from '../../../shared/types.ts';
import { fmtDate, PHASES } from '../format.ts';
import { TaskCard } from './TaskCard.tsx';

type Filter = 'todo' | 'all' | 'done';

export function Timeline({ plan, onToggle }: { plan: Plan; onToggle: (id: string, done: boolean) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const countryName = (code: string) =>
    code === plan.origin.code ? plan.origin.name : code === plan.dest.code ? plan.dest.name : code;
  const visible = plan.tasks.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done));
  const counts = { todo: plan.tasks.filter((t) => !t.done).length, done: plan.tasks.filter((t) => t.done).length, all: plan.tasks.length };

  return (
    <section aria-label="Timeline of tasks">
      <div className="filters" role="tablist" aria-label="Filter tasks">
        {(['all', 'todo', 'done'] as Filter[]).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'todo' ? 'To do' : f === 'all' ? 'All' : 'Done'} <span className="count">{counts[f]}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="empty">{filter === 'done' ? 'Nothing ticked off yet — you’ve got this.' : 'All done. Have a safe trip! 🎉'}</p>}
      <ol className="phases">
        {PHASES.map((ph) => {
          const tasks = visible.filter((t) => t.phase === ph.id);
          if (tasks.length === 0) return null;
          return (
            <li key={ph.id} className="phase">
              <div className="phase-head">
                <span className="phase-dot" aria-hidden />
                <div>
                  <h3>{ph.title}</h3>
                  <p>{ph.blurb}</p>
                </div>
              </div>
              <ul className="tasks">
                {tasks.map((t) => (
                  <TaskCard key={t.id} task={t} countryName={countryName} onToggle={onToggle} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      <p className="fineprint">
        Arrival: {fmtDate(plan.arrivalDate)}. Dates count back from your arrival day. Rules change — always confirm with the official
        authority and your vet before acting.
      </p>
    </section>
  );
}
