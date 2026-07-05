import type { ShareBundle } from '../core/share/shareBundle.ts';
import { shareBundleToPlainText, shareUrlForBundle } from '../core/share/shareBundle.ts';

interface Props {
  bundle: ShareBundle;
}

export default function SharedPassageView({ bundle }: Props) {
  async function copyLink(): Promise<void> {
    await navigator.clipboard.writeText(shareUrlForBundle(bundle));
  }

  async function nativeShare(): Promise<void> {
    const url = shareUrlForBundle(bundle);
    if (navigator.share) {
      await navigator.share({
        title: `${bundle.day.title} · St. Android's Missal`,
        text: shareBundleToPlainText(bundle),
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <main className="shared-view">
      <article className="shared-sheet">
        <header>
          <div className="shared-kicker">A shared passage from St. Android's Missal</div>
          <h1>{bundle.day.title}</h1>
          <div className="shared-meta">
            {bundle.day.date} · {bundle.day.weekday} · {bundle.day.season}
            {bundle.section ? ` · ${bundle.section}` : ''}
          </div>
        </header>

        {bundle.scriptureReferences.length > 0 && (
          <p className="shared-references">
            <strong>Scripture:</strong> {bundle.scriptureReferences.join('; ')}
          </p>
        )}

        <blockquote className="shared-passage">{bundle.selectedText}</blockquote>

        {bundle.annotations.length > 0 && (
          <section className="shared-annotations">
            <h2>Notes and annotations</h2>
            {bundle.annotations.map((annotation) => (
              <article key={annotation.id}>
                <blockquote>“{annotation.quote}”</blockquote>
                {annotation.note && <p>{annotation.note}</p>}
              </article>
            ))}
          </section>
        )}

        <footer>
          <p>
            This passage and its notes travelled inside the link itself. No hosted copy or account was required.
          </p>
          <div className="shared-actions">
            <button onClick={() => void nativeShare()}>Share onward</button>
            <button onClick={() => void copyLink()}>Copy link</button>
            <button onClick={() => window.print()}>Print / PDF</button>
            <a href={bundle.installUrl}>Get St. Android's Missal</a>
            <a className="quiet" href={bundle.sourceUrl}>Open the app</a>
          </div>
        </footer>
      </article>
    </main>
  );
}
