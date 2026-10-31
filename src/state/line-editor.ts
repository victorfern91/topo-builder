import { magnetReach } from "./point-marks.ts";
import type { CreateToolId } from "./tools.ts";
import {
  appendAnchor,
  attachAnchor,
  ensureLine,
  findLayer,
  hitTest,
  lineStore,
  moveMarkedPoint,
  nearestMarkedPoint,
  placeAnchor,
  selectAnchor,
  selectLine,
  setLineHover,
} from "./lines.ts";

type Gesture = {
  layerId: string;
  index: number;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  /** Set when this drag relocates a shared mark. */
  pointId: string | null;
  /** Mark a plain anchor will join when the pointer goes up inside the magnet. */
  pendingPointId: string | null;
};

let gesture: Gesture | null = null;

export function lineGestureActive(): boolean {
  return gesture !== null;
}

export function viewToContent(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  const safeZoom = zoom === 0 ? 1 : zoom;
  return {
    x: (clientX - rect.left - panX) / safeZoom,
    y: (clientY - rect.top - panY) / safeZoom,
  };
}

/** Owns the pointer when edit mode grabs a point or line, or when the create tool places a new point. */
export function pointerDownLine(
  x: number,
  y: number,
  zoom: number,
  kind: CreateToolId | "edit" | null,
): boolean {
  if (!kind) return false;
  if (kind === "edit") return beginEdit(x, y, zoom);
  const layerId = ensureLine(kind);
  const magnet = nearestMarkedPoint(
    x,
    y,
    magnetReach(zoom, lineStore.get().scale),
    layerId,
  );
  const index = appendAnchor(layerId, magnet?.x ?? x, magnet?.y ?? y);
  if (index < 0) return false;
  gesture = {
    layerId,
    index,
    originX: x,
    originY: y,
    startX: x,
    startY: y,
    pointId: null,
    pendingPointId: magnet?.id ?? null,
  };
  return true;
}

export function pointerMoveLine(x: number, y: number, zoom: number): void {
  if (!gesture) {
    setLineHover(hitTest(lineStore.get(), x, y, zoom));
    return;
  }
  const nextX = gesture.startX + (x - gesture.originX);
  const nextY = gesture.startY + (y - gesture.originY);
  if (gesture.pointId) {
    moveMarkedPoint(gesture.pointId, nextX, nextY);
    return;
  }
  const magnet = nearestMarkedPoint(
    nextX,
    nextY,
    magnetReach(zoom, lineStore.get().scale),
    gesture.layerId,
  );
  if (magnet) {
    placeAnchor(gesture.layerId, gesture.index, magnet.x, magnet.y);
    gesture.pendingPointId = magnet.id;
    return;
  }
  placeAnchor(gesture.layerId, gesture.index, nextX, nextY);
  gesture.pendingPointId = null;
}

export function pointerUpLine(): void {
  const current = gesture;
  gesture = null;
  if (!current || current.pointId || !current.pendingPointId) return;
  attachAnchor(current.layerId, current.index, current.pendingPointId);
}

function beginEdit(x: number, y: number, zoom: number): boolean {
  const hit = hitTest(lineStore.get(), x, y, zoom);
  if (hit?.type === "anchor") {
    selectAnchor(hit.layerId, hit.index);
    const anchor = findLayer(lineStore.get(), hit.layerId)?.anchors[hit.index];
    if (!anchor) return false;
    gesture = {
      layerId: hit.layerId,
      index: hit.index,
      originX: x,
      originY: y,
      startX: anchor.x,
      startY: anchor.y,
      pointId: anchor.pointId,
      pendingPointId: null,
    };
    return true;
  }
  if (hit?.type === "stroke") {
    selectLine(hit.layerId);
    gesture = null;
    return true;
  }
  return false;
}

export function hoverLine(x: number, y: number, zoom: number): void {
  if (gesture) return;
  setLineHover(hitTest(lineStore.get(), x, y, zoom));
}

export function clearLineHover(): void {
  if (gesture) return;
  setLineHover(null);
}
