import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GlossaryTerm } from '../planner.ts';

export const GlossaryContext = createContext<GlossaryTerm[]>([]);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Renders text and turns jargon words into tappable explanations. */
export function GlossaryText({ text }: { text: string }) {
  const glossary = useContext(GlossaryContext);
  const { re, lookup } = useMemo(() => {
    const lookup = new Map<string, GlossaryTerm>();
    for (const g of glossary) {
      // Very common words would light up everything — only match explicit terms here.
      for (const name of [g.term, ...g.aliases]) if (name.length > 3 || /^[A-Z]{3,}$/.test(name)) lookup.set(name.toLowerCase(), g);
    }
    lookup.delete('cargo');
    lookup.delete('cabin');
    const names = [...lookup.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
    return { re: names.length ? new RegExp(`\\b(${names.join('|')})\\b`, 'gi') : null, lookup };
  }, [glossary]);

  if (!re) return <>{text}</>;
  const out: ReactNode[] = [];
  const seen = new Set<string>();
  let last = 0;
  for (const m of text.matchAll(re)) {
    const term = lookup.get(m[0].toLowerCase());
    if (!term || seen.has(term.term)) continue;
    seen.add(term.term);
    out.push(text.slice(last, m.index));
    out.push(<Term key={m.index} label={m[0]} term={term} />);
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

function Term({ label, term }: { label: string; term: GlossaryTerm }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  // Close on Escape or a tap anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  return (
    <span className="term-wrap" ref={ref}>
      <button
        type="button"
        className="term"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {label}
      </button>
      {open && (
        <span className="term-pop" role="note">
          <strong>{term.term}</strong> {term.explanation}
          <button type="button" className="term-close" aria-label="Close explanation" onClick={() => setOpen(false)}>
            ×
          </button>
        </span>
      )}
    </span>
  );
}
