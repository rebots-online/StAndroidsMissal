/**
 * Exegesis panel — "Catholic meaning of ‹selected text›".
 * Real corpus evidence only: FTS5 concordance + vector-similar passages,
 * grouped by liturgical concept (e.g. Doxology) instead of flat lists.
 * The fine-tuned ecclesiastical LLM slot ships in the next major; until
 * then no generated commentary is fabricated.
 */

import { useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SelectionAction } from './ReaderView.tsx';
import type { ConcordanceHit, SimilarHit } from '../core/data/types.ts';

interface Props {
  db: CorpusDb;
  action: SelectionAction;
  onClose: () => void;
  onOpenKey: (nodeKey: string) => void;
}

function pathOf(key: string): string {
  return key.replace(/^section:/, '').replace(/#.*$/, '');
}
function sectionOf(key: string): string {
  const m = key.match(/#(.*)$/);
  return m ? m[1] : '';
}

function ConcordanceHitRow({ hit, onOpenKey }: { hit: ConcordanceHit; onOpenKey: (k: string) => void }) {
  return (
    <div className="hit" onClick={() => onOpenKey(hit.key)} style={{ cursor: 'pointer' }}>
      <div className="where">
        <span>{pathOf(hit.key)} · {sectionOf(hit.key)}</span>
      </div>
      <div className="text" dangerouslySetInnerHTML={{ __html: hit.snippet.replace(/«/g, '<b>«').replace(/»/g, '»</b>') }} />
    </div>
  );
}

function SimilarHitRow({ hit, onOpenKey }: { hit: SimilarHit; onOpenKey: (k: string) => void }) {
  return (
    <div className="hit" onClick={() => onOpenKey(hit.key)} style={{ cursor: 'pointer' }}>
      <div className="where">
        <span>{pathOf(hit.key)} · {hit.section}</span>
        <span className="score">{hit.score.toFixed(2)}</span>
      </div>
      <div className="text">{(hit.latin ?? hit.english ?? '').slice(0, 200)}…</div>
    </div>
  );
}

function ConceptGroup<T extends ConcordanceHit | SimilarHit>({
  label,
  description,
  count,
  hits,
  renderHit,
  onOpenKey,
}: {
  label: string;
  description: string | null;
  count: number;
  hits: T[];
  renderHit: (hit: T, onOpenKey: (k: string) => void) => React.ReactNode;
  onOpenKey: (k: string) => void;
}) {
  const [expanded, setExpanded] = useState(count <= 3);
  return (
    <div className="concept-group">
      <div
        className="concept-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <span className="concept-label">{label}</span>
        <span className="concept-count">{count}</span>
        {count > 3 && <span className="concept-toggle">{expanded ? '▾' : '▸'}</span>}
      </div>
      {description && <div className="concept-desc">{description}</div>}
      {expanded && (
        <div className="concept-hits">
          {hits.map((hit, i) => (
            <div key={i}>{renderHit(hit, onOpenKey)}</div>
          ))}
        </div>
      )}
      {!expanded && count > 3 && (
        <div className="concept-preview">
          {renderHit(hits[0], onOpenKey)}
        </div>
      )}
    </div>
  );
}

export default function MeaningPanel({ db, action, onClose, onOpenKey }: Props) {
  const { kind, term, nodeKey } = action;

  return (
    <aside className="exegesis">
      <button className="close" onClick={onClose} title="Close panel">✕</button>

      {kind === 'meaning' && (
        <>
          <h2>Catholic meaning</h2>
          <div className="term">“{term}”</div>

          {(() => {
            const concepts = db.conceptsForText(term, 4);
            if (concepts.length === 0) return null;
            return (
              <div className="concept-summary">
                <div className="group-title">This text relates to</div>
                {concepts.map((c) => (
                  <div key={c.conceptId} className="concept-tag">
                    <b>{c.label}</b>
                    {c.sectionCount > 0 && <span className="concept-tag-count"> · {c.sectionCount} instances</span>}
                    {c.description && <div className="concept-tag-desc">{c.description}</div>}
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="group-title">Concordance — where the corpus prays these words</div>
          {(() => {
            const groups = db.groupedConcordance(term, 30);
            if (groups.length === 0) {
              return <div className="hit">No literal occurrences elsewhere in the corpus — see the similar passages below.</div>;
            }
            return groups.map((g, i) => (
              <ConceptGroup
                key={i}
                label={g.label}
                description={g.description}
                count={g.count}
                hits={g.hits}
                renderHit={(hit, ok) => <ConcordanceHitRow hit={hit} onOpenKey={ok} />}
                onOpenKey={onOpenKey}
              />
            ));
          })()}

          <div className="group-title">Nearest by meaning (vector)</div>
          {(() => {
            const groups = db.groupedSimilarToText(term, 20, nodeKey ?? undefined);
            if (groups.length === 0) {
              return <div className="hit">No similar passages found.</div>;
            }
            return groups.map((g, i) => (
              <ConceptGroup
                key={i}
                label={g.label}
                description={g.description}
                count={g.count}
                hits={g.hits}
                renderHit={(hit, ok) => <SimilarHitRow hit={hit} onOpenKey={ok} />}
                onOpenKey={onOpenKey}
              />
            ));
          })()}

          <div className="llm-slot">
            ✠ <b>Next major:</b> a fine-tuned model on ecclesiastical Latin and Catholic
            doctrine will expound this selection here — word-by-word Latin morphology and
            the theological sense — grounded in the passages above.
          </div>
        </>
      )}

      {kind === 'similar' && (
        <>
          <h2>Similar passages</h2>
          <div className="term">“{term.slice(0, 120)}”</div>
          {(() => {
            const groups = db.groupedSimilarToText(term, 20, nodeKey ?? undefined);
            if (groups.length === 0) {
              return <div className="hit">No similar passages found.</div>;
            }
            return groups.map((g, i) => (
              <ConceptGroup
                key={i}
                label={g.label}
                description={g.description}
                count={g.count}
                hits={g.hits}
                renderHit={(hit, ok) => <SimilarHitRow hit={hit} onOpenKey={ok} />}
                onOpenKey={onOpenKey}
              />
            ));
          })()}
        </>
      )}

      {kind === 'crossrefs' && nodeKey && (
        <>
          <h2>Cross-references</h2>
          <div className="term">{pathOf(nodeKey)}</div>
          {db.crossRefs(pathOf(nodeKey)).map((x, i) => (
            <div className="hit" key={i}>
              <div className="where"><span>{x.rel}</span></div>
              <div className="text">
                {x.fromKey.replace('file:', '')} → <b>{x.toKey.replace('file:', '')}</b>
                {x.toTitle ? ` — ${x.toTitle}` : ''}
                {x.directive ? <><br /><i>directive: “{x.directive}”</i></> : null}
              </div>
            </div>
          ))}
          {db.crossRefs(pathOf(nodeKey)).length === 0 && (
            <div className="hit">This office carries no <i>vide/ex</i> commune directive — its propers are entirely its own.</div>
          )}
        </>
      )}
      {kind === 'crossrefs' && !nodeKey && <div className="hit">Select text inside a section to trace its cross-references.</div>}
    </aside>
  );
}
