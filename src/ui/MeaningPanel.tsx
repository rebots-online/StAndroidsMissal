/**
 * Exegesis panel — "Catholic meaning of ‹selected text›".
 * Real corpus evidence only: FTS5 concordance across the whole corpus plus
 * vector-similar passages. The fine-tuned ecclesiastical LLM slot ships in
 * the next major; until then no generated commentary is fabricated.
 */

import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SelectionAction } from './ReaderView.tsx';

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

export default function MeaningPanel({ db, action, onClose, onOpenKey }: Props) {
  const { kind, term, nodeKey } = action;

  return (
    <aside className="exegesis">
      <button className="close" onClick={onClose} title="Close panel">✕</button>

      {kind === 'meaning' && (
        <>
          <h2>Catholic meaning</h2>
          <div className="term">“{term}”</div>

          <div className="group-title">Concordance — where the corpus prays these words</div>
          {db.concordance(term, 12).map((h) => (
            <div className="hit" key={h.key} onClick={() => onOpenKey(h.key)} style={{ cursor: 'pointer' }}>
              <div className="where">
                <span>{pathOf(h.key)} · {sectionOf(h.key)}</span>
              </div>
              <div className="text" dangerouslySetInnerHTML={{ __html: h.snippet.replace(/«/g, '<b>«').replace(/»/g, '»</b>') }} />
            </div>
          ))}
          {db.concordance(term, 1).length === 0 && (
            <div className="hit">No literal occurrences elsewhere in the corpus — see the similar passages below.</div>
          )}

          <div className="group-title">Nearest by meaning (vector)</div>
          {db.similarToText(term, 5, nodeKey ?? undefined).map((h) => (
            <div className="hit" key={h.key} onClick={() => onOpenKey(h.key)} style={{ cursor: 'pointer' }}>
              <div className="where">
                <span>{pathOf(h.key)} · {h.section}</span>
                <span className="score">{h.score.toFixed(2)}</span>
              </div>
              <div className="text">{(h.latin ?? h.english ?? '').slice(0, 220)}…</div>
            </div>
          ))}

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
          {db.similarToText(term, 10, nodeKey ?? undefined).map((h) => (
            <div className="hit" key={h.key} onClick={() => onOpenKey(h.key)} style={{ cursor: 'pointer' }}>
              <div className="where">
                <span>{pathOf(h.key)} · {h.section}</span>
                <span className="score">{h.score.toFixed(2)}</span>
              </div>
              <div className="text">{(h.latin ?? h.english ?? '').slice(0, 200)}…</div>
            </div>
          ))}
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
