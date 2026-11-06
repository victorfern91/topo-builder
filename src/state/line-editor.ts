import { beginHistory, endHistory } from "./history.ts";
import {
  clampMarkSize,
  magnetReach,
  MARK_KIND,
  markRadius,
} from "./point-marks.ts";
import {
  moveExit,
  moveLabel,
  moveNote,
  resizeTextWidth,
  selectCallout,
  textFrame,
} from "./callouts.ts";
import { moveRouteNumber, setNumberDrag } from "./route-badge.ts";
import { badgeSpot, type RouteBadge } from "./route-number.ts";
import type { CreateToolId } from "./tools.ts";
import { viewportStore } from "./viewport.ts";
import {
  appendAnchor,
  attachAnchor,
  CORNER_SIGN,
  ensureLine,
  framePad,
  findLayer,
  hitTest,
  insideMaterialBand,
  landFreeMark,
  lineStore,
  markFrame,
  materialLanding,
  moveMarkedPoint,
  nearestMarkedPoint,
  placeAnchor,
  resizeMark,
  selectAnchor,
  selectLine,
  selectMark,
  setLineHover,
  setMaterialGrab,
  type MarkLanding,
} from "./lines.ts";

type AnchorGesture = {
  kind: "anchor";
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

type NumberGesture = {
  kind: "number";
  layerId: string;
  badge: RouteBadge;
  index: number;
};

type MarkGesture = {
  kind: "mark";
  pointId: string;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  /** Route spot free material joins when the pointer goes up inside the magnet. */
  landing: Exclude<MarkLanding, { type: "free" }> | null;
};

/** Scales a characteristic from a frame corner while the opposite corner stays put. */
type ResizeGesture = {
  kind: "resize";
  pointId: string;
  /** Opposite corner, in image pixels. */
  fixedX: number;
  fixedY: number;
  signX: number;
  signY: number;
  /** Pointer minus the grabbed corner at press. */
  offsetX: number;
  offsetY: number;
  /** Mark radius at size 1 and frame pad, in image pixels. */
  unit: number;
  pad: number;
};

type NoteGesture = {
  kind: "note";
  layerId: string;
  noteId: string;
};

type LabelGesture = {
  kind: "label";
  labelId: string;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
};

/** Changes the wrap width from a side. The center and the letter size stay put. */
type TextResizeGesture = {
  kind: "textResize";
  id: string;
  kindName: "note" | "label";
  centerX: number;
  signX: number;
  offsetX: number;
  base: number;
  pad: number;
};

type ExitGesture = {
  kind: "exit";
  exitId: string;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  startTipX: number;
  startTipY: number;
  /** Which end follows the pointer. The body moves both. */
  part: "body" | "tip" | "tail";
};

type Gesture =
  | AnchorGesture
  | NumberGesture
  | MarkGesture
  | ResizeGesture
  | NoteGesture
  | LabelGesture
  | TextResizeGesture
  | ExitGesture;

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
  if (!kind || lineGestureActive()) return false;
  beginHistory();
  try {
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
      kind: "anchor",
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
  } finally {
    if (!lineGestureActive()) endHistory();
  }
}

export function pointerMoveLine(x: number, y: number, zoom: number): void {
  if (!gesture) {
    setLineHover(hitTest(lineStore.get(), x, y, zoom));
    return;
  }
  if (gesture.kind === "number") {
    moveRouteNumber(gesture.layerId, gesture.badge, gesture.index, x, y);
    return;
  }
  if (gesture.kind === "note") {
    moveNote(gesture.layerId, gesture.noteId, x, y);
    return;
  }
  if (gesture.kind === "label") {
    moveLabel(
      gesture.labelId,
      gesture.startX + (x - gesture.originX),
      gesture.startY + (y - gesture.originY),
    );
    return;
  }
  if (gesture.kind === "exit") {
    const dx = x - gesture.originX;
    const dy = y - gesture.originY;
    if (gesture.part === "tip") {
      moveExit(gesture.exitId, {
        x: gesture.startX,
        y: gesture.startY,
        tipX: x,
        tipY: y,
      });
    } else if (gesture.part === "tail") {
      moveExit(gesture.exitId, {
        x,
        y,
        tipX: gesture.startTipX,
        tipY: gesture.startTipY,
      });
    } else {
      moveExit(gesture.exitId, {
        x: gesture.startX + dx,
        y: gesture.startY + dy,
        tipX: gesture.startTipX + dx,
        tipY: gesture.startTipY + dy,
      });
    }
    return;
  }
  if (gesture.kind === "resize") {
    resizeFromCorner(gesture, x, y);
    return;
  }
  if (gesture.kind === "textResize") {
    resizeTextFromEdge(gesture, x);
    return;
  }
  const nextX = gesture.startX + (x - gesture.originX);
  const nextY = gesture.startY + (y - gesture.originY);
  if (gesture.kind === "mark") {
    moveFreeMark(gesture, nextX, nextY, zoom);
    return;
  }
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
  setNumberDrag(null);
  setMaterialGrab(false);
  if (
    current?.kind === "anchor" &&
    !current.pointId &&
    current.pendingPointId
  ) {
    attachAnchor(current.layerId, current.index, current.pendingPointId);
  }
  if (current?.kind === "mark" && current.landing) {
    landFreeMark(
      current.pointId,
      current.landing,
      magnetReach(viewportStore.get().zoom, lineStore.get().scale),
    );
    setLineHover(null);
  }
  endHistory();
}

/** Material stays inside the band beside a route and snaps onto it inside the magnet. */
function moveFreeMark(
  current: MarkGesture,
  x: number,
  y: number,
  zoom: number,
): void {
  const state = lineStore.get();
  const point = state.points.find((item) => item.id === current.pointId);
  if (!point || MARK_KIND[point.mark] !== "material") {
    moveMarkedPoint(current.pointId, x, y);
    return;
  }
  const landing = materialLanding(state, x, y, zoom);
  current.landing = landing?.type === "free" ? null : landing;
  if (landing?.type === "anchor") {
    const anchor = findLayer(state, landing.layerId)?.anchors[landing.index];
    if (anchor) moveMarkedPoint(current.pointId, anchor.x, anchor.y);
    setLineHover(landing);
    return;
  }
  if (landing?.type === "line") {
    moveMarkedPoint(current.pointId, landing.x, landing.y);
    setLineHover({ type: "stroke", layerId: landing.layerId });
    return;
  }
  setLineHover({ type: "mark", pointId: current.pointId });
  const inside = insideMaterialBand(state, x, y);
  if (inside) moveMarkedPoint(current.pointId, inside.x, inside.y);
}

function resizeFromCorner(current: ResizeGesture, x: number, y: number): void {
  const side = Math.max(
    (x - current.offsetX - current.fixedX) * current.signX,
    (y - current.offsetY - current.fixedY) * current.signY,
  );
  const size = clampMarkSize((side / 2 - current.pad) / current.unit);
  const half = current.unit * size + current.pad;
  resizeMark(
    current.pointId,
    current.fixedX + current.signX * half,
    current.fixedY + current.signY * half,
    size,
  );
}

function resizeTextFromEdge(current: TextResizeGesture, x: number): void {
  if (!(current.base > 0)) return;
  const span =
    (x - current.offsetX - current.centerX) * current.signX - current.pad;
  resizeTextWidth(current.id, (span * 2) / current.base, current.kindName);
}

function beginEdit(x: number, y: number, zoom: number): boolean {
  const state = lineStore.get();
  const hit = hitTest(state, x, y, zoom);
  if (hit?.type === "labelEdge" || hit?.type === "noteEdge") {
    const frame = textFrame(state, zoom);
    if (!frame) return false;
    const sign = hit.edge === "e" ? 1 : -1;
    selectCallout(frame.id);
    gesture = {
      kind: "textResize",
      id: frame.id,
      kindName: frame.kind,
      centerX: frame.x,
      signX: sign,
      offsetX: x - (frame.x + sign * frame.halfW),
      base: frame.base,
      pad: framePad(zoom),
    };
    setLineHover(hit);
    return true;
  }
  if (hit?.type === "note") {
    selectCallout(hit.noteId);
    const layer = findLayer(lineStore.get(), hit.layerId);
    if (!layer || layer.locked) return true;
    gesture = { kind: "note", layerId: hit.layerId, noteId: hit.noteId };
    setLineHover(hit);
    return true;
  }
  if (hit?.type === "label") {
    const label = lineStore
      .get()
      .labels.find((item) => item.id === hit.labelId);
    if (!label) return false;
    selectCallout(label.id);
    if (label.locked) return true;
    gesture = {
      kind: "label",
      labelId: label.id,
      originX: x,
      originY: y,
      startX: label.x,
      startY: label.y,
    };
    setLineHover(hit);
    return true;
  }
  if (
    hit?.type === "exit" ||
    hit?.type === "exitTip" ||
    hit?.type === "exitTail"
  ) {
    const exit = lineStore.get().exits.find((item) => item.id === hit.exitId);
    if (!exit) return false;
    selectCallout(exit.id);
    if (exit.locked) return true;
    gesture = {
      kind: "exit",
      exitId: exit.id,
      originX: x,
      originY: y,
      startX: exit.x,
      startY: exit.y,
      startTipX: exit.tipX,
      startTipY: exit.tipY,
      part:
        hit.type === "exitTip"
          ? "tip"
          : hit.type === "exitTail"
            ? "tail"
            : "body",
    };
    setLineHover(hit);
    return true;
  }
  if (hit?.type === "markCorner") {
    const frame = markFrame(state, zoom);
    const point = state.points.find((item) => item.id === hit.pointId);
    if (!frame || !point) return false;
    const sign = CORNER_SIGN[hit.corner];
    gesture = {
      kind: "resize",
      pointId: point.id,
      fixedX: frame.x - sign.x * frame.half,
      fixedY: frame.y - sign.y * frame.half,
      signX: sign.x,
      signY: sign.y,
      offsetX: x - (frame.x + sign.x * frame.half),
      offsetY: y - (frame.y + sign.y * frame.half),
      unit: markRadius(state.scale, point.mark),
      pad: framePad(zoom),
    };
    setLineHover(hit);
    return true;
  }
  if (hit?.type === "number") {
    selectLine(hit.layerId);
    const layer = findLayer(lineStore.get(), hit.layerId);
    if (!layer || layer.locked || !badgeSpot(layer, hit.badge, hit.index))
      return true;
    const spot = { layerId: hit.layerId, badge: hit.badge, index: hit.index };
    gesture = { kind: "number", ...spot };
    setNumberDrag(spot);
    setLineHover(hit);
    return true;
  }
  if (hit?.type === "mark") {
    const point = lineStore
      .get()
      .points.find((item) => item.id === hit.pointId);
    if (!point) return false;
    selectMark(point.id);
    gesture = {
      kind: "mark",
      pointId: point.id,
      originX: x,
      originY: y,
      startX: point.x,
      startY: point.y,
      landing: null,
    };
    setMaterialGrab(MARK_KIND[point.mark] === "material");
    setLineHover(hit);
    return true;
  }
  if (hit?.type === "anchor") {
    selectAnchor(hit.layerId, hit.index);
    const anchor = findLayer(lineStore.get(), hit.layerId)?.anchors[hit.index];
    if (!anchor) return false;
    gesture = {
      kind: "anchor",
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
