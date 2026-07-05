import type { Annotation } from '../annotations/store.ts';
import type { DayInfo } from '../data/types.ts';

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
  createdAt: string;
}

export function createShareBundle(input: {
  selectedText: string;
  scriptureReferences: string[];
  annotations: Annotation[];
  nodeKey: string | null;
  day: DayInfo;
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
    sourceUrl: window.location.href,
    createdAt: new Date().toISOString(),
  };
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

  return `# ${bundle.day.title}\n\n` +
    `**${bundle.day.date} · ${bundle.day.weekday} · ${bundle.day.season}${section}**\n\n` +
    references +
    `> ${bundle.selectedText.replace(/\n/g, '\n> ')}` +
    annotations +
    `\n\n_Source: St. Android's Missal · ${bundle.sourceUrl}_\n`;
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
    `“${bundle.selectedText}”${annotations}\n\nSt. Android's Missal\n${bundle.sourceUrl}`;
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
      link: null,
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
    appState: {
      gridSize: null,
      viewBackgroundColor: '#fffdf7',
    },
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
