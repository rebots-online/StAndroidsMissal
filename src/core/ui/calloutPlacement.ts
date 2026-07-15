/**
 * calloutPlacement — anchor-rect based floating callout positioning.
 *
 * Prefer above when it fits, otherwise below; if neither fully fits choose
 * the side with more room. Clamp to an 8px viewport inset and guarantee the
 * final callout rectangle does not intersect the anchor rectangle whenever
 * either side has room.
 */

export interface DOMRectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface FloatingCalloutPlacement {
  left: number;
  top: number;
  side: 'above' | 'below';
}

const VIEWPORT_INSET = 8;

function rectContains(a: DOMRectLike, b: DOMRectLike): boolean {
  return b.left >= a.left && b.right <= a.right && b.top >= a.top && b.bottom <= a.bottom;
}

export function placeFloatingCallout(
  anchor: DOMRectLike,
  box: Size,
  viewport: DOMRectLike,
  gap: number = 12
): FloatingCalloutPlacement {
  const safeViewport: DOMRectLike = {
    left: viewport.left + VIEWPORT_INSET,
    top: viewport.top + VIEWPORT_INSET,
    right: viewport.right - VIEWPORT_INSET,
    bottom: viewport.bottom - VIEWPORT_INSET,
    width: viewport.width - 2 * VIEWPORT_INSET,
    height: viewport.height - 2 * VIEWPORT_INSET,
  };

  const roomAbove = anchor.top - safeViewport.top;
  const roomBelow = safeViewport.bottom - anchor.bottom;
  const aboveHasRoom = roomAbove >= box.height + gap;
  const belowHasRoom = roomBelow >= box.height + gap;

  const calloutAbove: DOMRectLike = {
    left: anchor.left,
    top: anchor.top - gap - box.height,
    right: anchor.left + box.width,
    bottom: anchor.top - gap,
    width: box.width,
    height: box.height,
  };

  const calloutBelow: DOMRectLike = {
    left: anchor.left,
    top: anchor.bottom + gap,
    right: anchor.left + box.width,
    bottom: anchor.bottom + gap + box.height,
    width: box.width,
    height: box.height,
  };

  const fitsAbove = rectContains(safeViewport, calloutAbove);
  const fitsBelow = rectContains(safeViewport, calloutBelow);

  let placement: FloatingCalloutPlacement;

  if (fitsAbove) {
    placement = { left: calloutAbove.left, top: calloutAbove.top, side: 'above' };
  } else if (fitsBelow) {
    placement = { left: calloutBelow.left, top: calloutBelow.top, side: 'below' };
  } else if (aboveHasRoom || belowHasRoom) {
    placement = roomAbove >= roomBelow
      ? { left: calloutAbove.left, top: calloutAbove.top, side: 'above' }
      : { left: calloutBelow.left, top: calloutBelow.top, side: 'below' };
  } else {
    placement = roomAbove >= roomBelow
      ? { left: calloutAbove.left, top: calloutAbove.top, side: 'above' }
      : { left: calloutBelow.left, top: calloutBelow.top, side: 'below' };
  }

  placement.left = Math.max(safeViewport.left, Math.min(safeViewport.right - box.width, placement.left));
  placement.top = Math.max(safeViewport.top, Math.min(safeViewport.bottom - box.height, placement.top));

  return placement;
}