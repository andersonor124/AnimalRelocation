import { useState } from 'react';
import type { PlanTask } from '../../../shared/types.ts';
import { fmtDate, fmtShort, relDays, STATUS_LABEL } from '../format.ts';
import { GlossaryText } from './GlossaryText.tsx';

interface Props {
  task: PlanTask;
  countryName: (code: string) => string;
  onToggle: (id: string, done: boolean) => void;
}

const SOURCE: Record<PlanTask['direction'], (n: string) => string> = {
  import: (n) => `${n} entry rule`,
  export: (n) => `${n} exit rule`,
  general: () => 'Good practice',
};

const VERIFY: Record<PlanTask['verification'], string> = {
  official: 'Checked against the official source',
  reviewed: 'Reviewed against official sources',
  general: 'General guidance — confirm with the official source',
};

export function TaskCard({ task: t, countryName, onToggle }: Props) {
  const [open, setOpen] = useState(t.status === 'due-soon' || t.status === 'impossible' || t.status === 'overdue');
  const sameDay = t.startBy === t.dueDate;
  return (
    <li className={`task status-${t.status} ${t.done ? 'is-done' : ''}`} data-task-id={t.id}>
      <div className="task-head">
        <label className="task-check">
          <input
            type="checkbox"
            checked={t.done}
            onChange={(e) => onToggle(t.id, e.target.checked)}
            aria-label={`Mark "${t.title}" as done`}
          />
          <span className="tick" aria-hidden />
        </label>
        <button type="button" className="task-title" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="task-name">{t.title}</span>
          <span className="task-meta">
            <span className={`pill pill-${t.status}`}>{STATUS_LABEL[t.status]}</span>
            {t.critical ? <span className="pill pill-req">Required</span> : <span className="pill pill-rec">Recommended</span>}
            <span className="task-src">{SOURCE[t.direction](countryName(t.countryCode))}</span>
          </span>
          <span className="task-when">
            {t.done ? (
              'Completed'
            ) : sameDay ? (
              <>
                On <strong>{fmtShort(t.dueDate)}</strong> · {relDays(t.daysUntilDue)}
              </>
            ) : (
              <>
                Start {fmtShort(t.startBy)} · finish by <strong>{fmtShort(t.dueDate)}</strong> ({relDays(t.daysUntilDue)})
              </>
            )}
          </span>
          <span className="chev" aria-hidden>
            ▾
          </span>
        </button>
      </div>
      {open && (
        <div className="task-body">
          <dl>
            <dt>What</dt>
            <dd>
              <GlossaryText text={t.what} />
            </dd>
            <dt>Why it matters</dt>
            <dd>
              <GlossaryText text={t.why} />
            </dd>
            <dt>How to do it</dt>
            <dd>
              <GlossaryText text={t.how} />
            </dd>
            {t.windowOpens && (
              <>
                <dt>Timing window</dt>
                <dd>
                  Not before <strong>{fmtDate(t.windowOpens)}</strong>, and finished by <strong>{fmtDate(t.dueDate)}</strong>. Doing it
                  too early makes it invalid.
                </dd>
              </>
            )}
            {t.durationDays > 0 && (
              <>
                <dt>How long it takes</dt>
                <dd>Allow about {t.durationDays} days for processing.</dd>
              </>
            )}
            {t.estCost && (
              <>
                <dt>Rough cost</dt>
                <dd>{t.estCost}</dd>
              </>
            )}
          </dl>
          {t.tip && (
            <p className="tip">
              <span aria-hidden>💡</span> <GlossaryText text={t.tip} />
            </p>
          )}
          <p className="task-foot">
            {t.officialUrl && (
              <a href={t.officialUrl} target="_blank" rel="noreferrer">
                Official information ↗
              </a>
            )}
            <span className={`verify verify-${t.verification}`}>
              {VERIFY[t.verification]} · last reviewed {fmtDate(t.lastChecked)}
            </span>
          </p>
        </div>
      )}
    </li>
  );
}
