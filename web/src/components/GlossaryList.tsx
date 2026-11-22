import { useContext, useState } from 'react';
import { GlossaryContext } from './GlossaryText.tsx';

export function GlossaryList() {
  const glossary = useContext(GlossaryContext);
  const [q, setQ] = useState('');
  const items = glossary.filter((g) =>
    [g.term, ...g.aliases, g.explanation].some((s) => s.toLowerCase().includes(q.trim().toLowerCase())),
  );
  return (
    <section aria-label="Words explained">
      <label className="field">
        <span>Search for a word</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. titer, cargo, endorse" />
      </label>
      <dl className="glossary">
        {items.map((g) => (
          <div key={g.term} className="card">
            <dt>
              {g.term}
              {g.aliases.length > 0 && <small> also called {g.aliases.join(', ')}</small>}
            </dt>
            <dd>{g.explanation}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
