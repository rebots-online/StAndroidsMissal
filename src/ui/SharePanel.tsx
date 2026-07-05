import { useMemo, useState } from 'react';
import { annotationsFor, type Annotation } from '../core/annotations/store.ts';
import type { DayInfo } from '../core/data/types.ts';
import {
  createShareBundle,
  downloadTextFile,
  shareBundleToExcalidraw,
  shareBundleToMarkdown,
  shareBundleToPlainText,
  shareBundleToStandaloneHtml,
  shareUrlForBundle,
} from '../core/share/shareBundle.ts';

interface Props {
  day: DayInfo;
  term: string;
  nodeKey: string | null;
  scriptureReferences: string[];
  onClose: () => void;
}

function relatedAnnotations(all: Annotation[], term: string): Annotation[] {
  const normalized = term.trim().toLocaleLowerCase();
  if (!normalized) return all;
  const related = all.filter((annotation) => {
    const quote = annotation.quote.trim().toLocaleLowerCase();
    return quote && (normalized.includes(quote) || quote.includes(normalized));
  });
  return related.length ? related : all;
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'shared-passage';
}

export default function SharePanel({ day, term, nodeKey, scriptureReferences, onClose }: Props) {
  const availableAnnotations = useMemo(() => nodeKey ? annotationsFor(nodeKey) : [], [nodeKey]);
  const defaults = useMemo(() => relatedAnnotations(availableAnnotations, term).map((item) => item.id), [availableAnnotations, term]);
  const [includedIds, setIncludedIds] = useState<Set<string>>(() => new Set(defaults));
  const [status, setStatus] = useState('');

  const includedAnnotations = availableAnnotations.filter((annotation) => includedIds.has(annotation.id));
  const bundle = createShareBundle({
    selectedText: term,
    scriptureReferences,
    annotations: includedAnnotations,
    nodeKey,
    day,
  });
  const shareUrl = shareUrlForBundle(bundle);
  const fileBase = `${day.date}-${slug(day.feastName ?? day.weekKey)}`;

  function toggleAnnotation(id: string): void {
    setIncludedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copy(value: string, message: string): Promise<void> {
    await navigator.clipboard.writeText(value);
    setStatus(message);
  }

  async function nativeShare(): Promise<void> {
    if (!navigator.share) {
      await copy(shareUrl, 'Annotated link copied');
      return;
    }
    await navigator.share({
      title: `${day.feastName ?? day.weekKey} · St. Android's Missal`,
      text: shareBundleToPlainText(bundle),
      url: shareUrl,
    });
  }

  function printBundle(): void {
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
      setStatus('Pop-up blocked. Use standalone HTML instead.');
      return;
    }
    popup.document.open();
    popup.document.write(shareBundleToStandaloneHtml(bundle));
    popup.document.close();
    popup.addEventListener('load', () => popup.print(), { once: true });
  }

  return (
    <aside className="exegesis share-panel">
      <button className="close" onClick={onClose} title="Close share panel">✕</button>
      <h2>Share this passage</h2>
      <div className="term">“{term.slice(0, 180)}{term.length > 180 ? '…' : ''}”</div>

      {scriptureReferences.length > 0 && (
        <div className="share-references">
          <strong>Scripture</strong>
          <span>{scriptureReferences.join('; ')}</span>
        </div>
      )}

      <div className="group-title">Annotations included</div>
      {availableAnnotations.length === 0 && <p className="share-muted">No annotations are anchored to this section yet.</p>}
      {availableAnnotations.map((annotation) => (
        <label className="share-annotation" key={annotation.id}>
          <input
            type="checkbox"
            checked={includedIds.has(annotation.id)}
            onChange={() => toggleAnnotation(annotation.id)}
          />
          <span>
            <em>“{annotation.quote.slice(0, 100)}{annotation.quote.length > 100 ? '…' : ''}”</em>
            {annotation.note && <small>{annotation.note}</small>}
          </span>
        </label>
      ))}

      <div className="group-title">Portable share</div>
      <p className="share-muted">
        The passage and selected notes are encoded inside the link fragment. No account or hosted document is required.
      </p>
      <div className="share-actions">
        <button className="btn" onClick={() => void copy(shareUrl, 'Annotated link copied')}>Copy annotated link</button>
        <button className="btn secondary" onClick={() => void nativeShare()}>Device share</button>
        <button className="btn secondary" onClick={() => void copy(shareBundleToPlainText(bundle), 'Share text copied')}>Copy composed text</button>
      </div>
      <div className={`share-length${shareUrl.length > 8000 ? ' long' : ''}`}>
        Link size: {shareUrl.length.toLocaleString()} characters
        {shareUrl.length > 8000 && ' · Some messaging systems may shorten it; use standalone HTML for this larger parcel.'}
      </div>

      <div className="group-title">Newsletter and fellowship</div>
      <div className="share-actions">
        <button className="btn secondary" onClick={() => void copy(shareBundleToMarkdown(bundle), 'Newsletter Markdown copied')}>Copy newsletter Markdown</button>
        <button className="btn secondary" onClick={() => downloadTextFile(`${fileBase}.md`, shareBundleToMarkdown(bundle), 'text/markdown')}>Download Markdown</button>
        <button className="btn secondary" onClick={() => downloadTextFile(`${fileBase}.html`, shareBundleToStandaloneHtml(bundle), 'text/html')}>Standalone HTML</button>
      </div>

      <div className="group-title">EcclesiDraw and archive</div>
      <div className="share-actions">
        <button className="btn secondary" onClick={() => downloadTextFile(`${fileBase}.excalidraw`, shareBundleToExcalidraw(bundle), 'application/json')}>EcclesiDraw canvas</button>
        <button className="btn secondary" onClick={() => downloadTextFile(`${fileBase}.json`, JSON.stringify(bundle, null, 2), 'application/json')}>Share bundle JSON</button>
        <button className="btn secondary" onClick={printBundle}>Print / Save PDF</button>
      </div>

      <div className="install-note">
        Every format includes the installer location. The shared composition remains readable without installing or subscribing.
      </div>
      {status && <div className="share-status" role="status">{status}</div>}
    </aside>
  );
}
