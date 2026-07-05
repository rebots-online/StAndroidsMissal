import type { Annotation } from '../annotations/store.ts';
import type { DayInfo } from '../data/types.ts';

export const DEFAULT_INSTALL_URL =
  import.meta.env.VITE_INSTALL_URL || 'https://github.com/rebots-online/StAndroidsMissal/releases/latest';

export interface ShareBundle {
  schema: 'mba.robin.standroidsmissal.share.v1';
  selectedText: string;
  scriptureReferences: string[];
  annotations: Annotation[];
  nodeKey: string | null;
  section: string | null;
  day: {
    date: string;
    title: string;
    weekday: string;
    season: string;
    weekKey: string;
    color: string;
  };
  sourceUrl: string;
  installUrl: string;
  createdAt: string;
}

function baseAppUrl(): string {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
}

export function createShareBundle(input: {
  selectedText: string;
  scriptureReferences: string[];
  annotations: Annotation[];
  nodeKey: string | null;
  day: DayInfo;
  installUrl?: string;
}): ShareBundle {
  const section = input.nodeKey?.match(/#(.+)$/)?.[1] ?? null;
  return {
    schema: 'mba.robin.standroidsmissal.share.v1',
    selectedText: input.selectedText.trim(),
    scriptureReferences: [...new Set(input.scriptureReferences.map((ref) => ref.trim()).filter(Boolean))],
    annotations: input.annotations,
    nodeKey: input.nodeKey,
    section,
    day: {
      date: input.day.date,
      title: input.day.feastName ?? input.day.weekKey,
      weekday: input.day.weekday,
      season: input.day.season,
      weekKey: input.day.weekKey,
      color: String(input.day.color),
    },
    sourceUrl: baseAppUrl(),
    installUrl: input.installUrl ?? DEFAULT_INSTALL_URL,
    createdAt: new Date().toISOString(),
  };
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function shareUrlForBundle(bundle: ShareBundle): string {
  const url = new URL(bundle.sourceUrl || baseAppUrl());
  url.hash = `share=v1.${toBase64Url(JSON.stringify(bundle))}`;
  return url.toString();
}

export function decodeShareHash(hash = window.location.hash): ShareBundle | null {
  const match = hash.match(/^#share=v1\.([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(match[1])) as ShareBundle;
    if (parsed.schema !== 'mba.robin.standroidsmissal.share.v1' || !parsed.selectedText || !parsed.day) return null;
    return parsed;
  } catch {
    return null;
  }
}

function annotationMarkdown(annotation: Annotation): string {
  const quote = annotation.quote.trim() ? `> ${annotation.quote.trim().replace(/\n/g, '\n> ')}\n` : '';
  const note = annotation.note.trim() ? `\n**Annotation:** ${annotation.note.trim()}\n` : '';
  return `${quote}${note}`.trim();
}

export function shareBundleToMarkdown(bundle: ShareBundle): string {
  const references = bundle.scriptureReferences.length
    ? `**Scripture:** ${bundle.scriptureReferences.join('; ')}\n\n`
    : '';
  const annotations = bundle.annotations.length
    ? `\n\n## Notes and annotations\n\n${bundle.annotations.map(annotationMarkdown).join('\n\n')}`
    : '';
  const section = bundle.section ? ` · ${bundle.section}` : '';
  const shareUrl = shareUrlForBundle(bundle);

  return `# ${bundle.day.title}\n\n` +
    `**${bundle.day.date} · ${bundle.day.weekday} · ${bundle.day.season}${section}**\n\n` +
    references +
    `> ${bundle.selectedText.replace(/\n/g, '\n> ')}` +
    annotations +
    `\n\n---\n\n` +
    `Open this annotated passage: ${shareUrl}\n\n` +
    `Install St. Android's Missal: ${bundle.installUrl}\n`;
}

export function shareBundleToPlainText(bundle: ShareBundle): string {
  const references = bundle.scriptureReferences.length
    ? `Scripture: ${bundle.scriptureReferences.join('; ')}\n`
    : '';
  const annotations = bundle.annotations.length
    ? `\nAnnotations:\n${bundle.annotations.map((annotation, index) =>
        `${index + 1}. “${annotation.quote}”${annotation.note ? `\n   ${annotation.note}` : ''}`
      ).join('\n')}`
    : '';

  return `${bundle.day.title}\n${bundle.day.date} · ${bundle.day.weekday} · ${bundle.day.season}` +
    `${bundle.section ? ` · ${bundle.section}` : ''}\n${references}\n` +
    `“${bundle.selectedText}”${annotations}\n\n` +
    `Open this annotated passage:\n${shareUrlForBundle(bundle)}\n\n` +
    `Install St. Android's Missal:\n${bundle.installUrl}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function shareBundleToStandaloneHtml(bundle: ShareBundle): string {
  const references = bundle.scriptureReferences.length
    ? `<p class="references"><strong>Scripture:</strong> ${escapeHtml(bundle.scriptureReferences.join('; '))}</p>`
    : '';
  const annotations = bundle.annotations.length
    ? `<section><h2>Notes and annotations</h2>${bundle.annotations.map((annotation) => `
      <article class="annotation">
        <blockquote>${escapeHtml(annotation.quote).replace(/\n/g, '<br>')}</blockquote>
        ${annotation.note ? `<p>${escapeHtml(annotation.note).replace(/\n/g, '<br>')}</p>` : ''}
      </article>`).join('')}</section>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(bundle.day.title)} · St. Android's Missal</title>
<style>
:root{color-scheme:light dark;--paper:#fbf7ee;--ink:#241d15;--muted:#695e51;--rule:#d8ccb6;--accent:#7a1f2b}
@media(prefers-color-scheme:dark){:root{--paper:#17130f;--ink:#eee5d7;--muted:#b8aa96;--rule:#443a2d;--accent:#d98691}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:18px/1.6 Georgia,serif}main{max-width:820px;margin:auto;padding:clamp(24px,7vw,72px)}header{border-bottom:3px double var(--accent);padding-bottom:18px;margin-bottom:30px}h1{font-size:clamp(32px,6vw,56px);line-height:1.08;margin:.15em 0}.meta,.references,footer{color:var(--muted);font-family:system-ui,sans-serif;font-size:.82rem}.passage{font-size:1.25rem;border-left:5px solid var(--accent);margin:30px 0;padding:8px 0 8px 24px;white-space:pre-wrap}.annotation{border:1px solid var(--rule);padding:15px 18px;margin:12px 0}.annotation blockquote{margin:0 0 8px;font-style:italic}.install{display:inline-block;background:var(--accent);color:white;padding:10px 16px;text-decoration:none}footer{border-top:1px solid var(--rule);margin-top:40px;padding-top:20px}@media print{.install{display:none}}
</style></head><body><main>
<header><div class="meta">St. Android's Missal · ${escapeHtml(bundle.day.date)} · ${escapeHtml(bundle.day.weekday)} · ${escapeHtml(bundle.day.season)}</div><h1>${escapeHtml(bundle.day.title)}</h1>${bundle.section ? `<div class="meta">${escapeHtml(bundle.section)}</div>` : ''}</header>
${references}<blockquote class="passage">${escapeHtml(bundle.selectedText)}</blockquote>${annotations}
<footer><p>This file contains the complete shared passage and annotations. No hosted copy is required.</p><p><a class="install" href="${escapeHtml(bundle.installUrl)}">Get St. Android's Missal</a></p></footer>
<script type="application/json" id="st-androids-share">${escapeHtml(JSON.stringify(bundle))}</script>
</main></body></html>`;
}

export function shareBundleToExcalidraw(bundle: ShareBundle): string {
  const noteLines = bundle.annotations.flatMap((annotation) => [
    `“${annotation.quote}”`,
    annotation.note || '(highlight only)',
  ]);
  const body = [
    bundle.day.title,
    `${bundle.day.date} · ${bundle.section ?? bundle.day.weekKey}`,
    bundle.scriptureReferences.join('; '),
    '',
    bundle.selectedText,
    ...(noteLines.length ? ['', 'Annotations', ...noteLines] : []),
    '',
    `Install: ${bundle.installUrl}`,
  ].filter((line, index, list) => line || (index > 0 && list[index - 1]));

  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'https://github.com/rebots-online/StAndroidsMissal',
    elements: [{
      id: `ecclesidraw-${Date.now()}`,
      type: 'text',
      x: 80,
      y: 80,
      width: 760,
      height: Math.max(180, body.length * 28),
      angle: 0,
      strokeColor: '#1b1b1b',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 2147483647),
      version: 1,
      versionNonce: Math.floor(Math.random() * 2147483647),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: shareUrlForBundle(bundle),
      locked: false,
      text: body.join('\n'),
      fontSize: 22,
      fontFamily: 1,
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: null,
      originalText: body.join('\n'),
      autoResize: true,
      lineHeight: 1.25,
    }],
    appState: { gridSize: null, viewBackgroundColor: '#fffdf7' },
    files: {},
    stAndroidsShareBundle: bundle,
  }, null, 2);
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
