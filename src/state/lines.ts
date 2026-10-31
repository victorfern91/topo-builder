import { batch, Store } from "@tanstack/store";
import { produce, setAutoFreeze } from "immer";
import { t } from "../i18n/index.ts";
import { closestOnLine, curveDistance2, lineGeometry } from "./line-curve.ts";
import { markRadius, type PointMark } from "./point-marks.ts";
import type { CreateToolId } from "./tools.ts";
import { MAX_ZOOM, MIN_ZOOM } from "./viewport.ts";

export type LineKind = CreateToolId;

export type Anchor = {
  x: number;
  y: number;
  /** Shared annotation. Null is a plain handle. */
  pointId: string | null;
};

/** One piece of gear. Every route anchor with this id sits on the same spot. */
export type MarkedPoint = {
  id: string;
  x: number;
  y: number;
  mark: PointMark;
};

/** Same bounds as the zoom slider, so a given percent sits in the same place on both. */
export const DRAW_SCALE_MIN = MIN_ZOOM;
export const DRAW_SCALE_MAX = MAX_ZOOM;
export const DEFAULT_DRAW_SCALE = 1;

/** Image-pixel stroke at scale 1. Paint and hit testing multiply by each line's scale. */
export const LINE_STROKE = 3;

export function clampDrawScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DRAW_SCALE;
  return Math.min(DRAW_SCALE_MAX, Math.max(DRAW_SCALE_MIN, value));
}

export type LineLayer = {
  id: string;
  name: string;
  kind: LineKind;
  color: string;
  anchors: Anchor[];
  /** Stroke size relative to the photo. Stays on the line after it is created. */
  scale: number;
  /** Bumps when anchors change so the canvas can reuse an unchanged Path2D. */
  geometryRevision: number;
};

export type LineHit =
  | { type: "anchor"; layerId: string; index: number }
  | { type: "stroke"; layerId: string };

export type LineState = {
  layers: LineLayer[];
  activeId: string | null;
  /** Anchor chosen on the active line. Delete and the point menu use it. */
  anchorIndex: number | null;
  /** Scale the top bar writes onto every line, and that new lines copy. */
  scale: number;
  /** Annotations routes can share. Anchors reference these by id. */
  points: MarkedPoint[];
  revision: number;
};

export const LINE_COLORS = [
  "#ff4d4d",
  "#ffb020",
  "#3ddc97",
  "#4c9aff",
  "#c084fc",
  "#ff7ab2",
  "#2ee6d6",
  "#f2f2f2",
] as const;

export type LineColor = (typeof LINE_COLORS)[number];

const HIT_PX = 8;

let sequence = 0;
let pointSequence = 0;

/**
 * Geometry stays on the live layer objects so a dragged anchor does not
 * copy the layer list. Immer must not freeze those objects.
 */
setAutoFreeze(false);

/** Lines, selection, scale, and shared marks. */
export const lineStore = new Store<LineState>({
  layers: [],
  activeId: null,
  anchorIndex: null,
  scale: DEFAULT_DRAW_SCALE,
  points: [],
  revision: 0,
});

/** Pointer target. Its own store so a hover does not publish the line document. */
export const lineHoverStore = new Store<LineHit | null>(null);

function patch(recipe: (draft: LineState) => void): void {
  lineStore.setState((state) => produce(state, recipe));
}

/** Notifies canvas subscribers. The layer list keeps its identity. */
function publish(): void {
  patch((draft) => {
    draft.revision += 1;
  });
}

export function beginLine(kind: LineKind): string {
  const layer = createLayer(kind, lineStore.get().layers);
  patch((draft) => {
    draft.layers.push(layer);
    draft.activeId = layer.id;
    draft.anchorIndex = null;
    draft.revision += 1;
  });
  return layer.id;
}

export function ensureLine(kind: LineKind): string {
  const state = lineStore.get();
  if (state.activeId && findLayer(state, state.activeId)) return state.activeId;
  return beginLine(kind);
}

/** Keeps the geometry and clears the selection. */
export function finishLine(): void {
  batch(() => {
    patch((draft) => {
      if (draft.activeId === null && draft.anchorIndex === null) return;
      draft.activeId = null;
      draft.anchorIndex = null;
    });
    setLineHover(null);
  });
}

export function selectLine(id: string): void {
  patch((draft) => {
    if (!findLayer(draft, id)) return;
    if (draft.activeId === id && draft.anchorIndex === null) return;
    draft.activeId = id;
    draft.anchorIndex = null;
  });
}

export function selectAnchor(layerId: string, index: number): void {
  patch((draft) => {
    const layer = findLayer(draft, layerId);
    if (!layer || !layer.anchors[index]) return;
    if (draft.activeId === layerId && draft.anchorIndex === index) return;
    draft.activeId = layerId;
    draft.anchorIndex = index;
  });
}

export function setLineColor(id: string, color: LineColor): void {
  patch((draft) => {
    const layer = draft.layers.find((item) => item.id === id);
    if (!layer || layer.color === color) return;
    layer.color = color;
    draft.revision += 1;
  });
}

export function renameLine(id: string, name: string): void {
  patch((draft) => {
    const layer = draft.layers.find((item) => item.id === id);
    if (!layer || layer.name === name) return;
    layer.name = name;
    draft.revision += 1;
  });
}

/** Sets the drawing scale and writes it onto every line so they stay the same size on the photo. */
export function setDrawScale(scale: number): void {
  const next = clampDrawScale(scale);
  patch((draft) => {
    if (
      draft.scale === next &&
      draft.layers.every((layer) => layer.scale === next)
    )
      return;
    draft.scale = next;
    for (const layer of draft.layers) {
      if (layer.scale !== next) layer.scale = next;
    }
    draft.revision += 1;
  });
}

export function clearLines(): void {
  batch(() => {
    patch((draft) => {
      if (
        draft.layers.length === 0 &&
        draft.points.length === 0 &&
        draft.activeId === null &&
        draft.anchorIndex === null
      )
        return;
      draft.layers = [];
      draft.points = [];
      draft.activeId = null;
      draft.anchorIndex = null;
      draft.revision += 1;
    });
    setLineHover(null);
  });
}

export function setLineHover(hover: LineHit | null): void {
  lineHoverStore.setState((current) =>
    sameHit(current, hover) ? current : hover,
  );
}

/** Appends a corner. Mutates the layer list in place so the table does not re-render. */
export function appendAnchor(layerId: string, x: number, y: number): number {
  const layer = findLayer(lineStore.get(), layerId);
  if (!layer) return -1;
  layer.anchors.push({ x, y, pointId: null });
  touch(layer);
  return layer.anchors.length - 1;
}

/** Moves a plain anchor. Shared marks move through `moveMarkedPoint`. */
export function placeAnchor(
  layerId: string,
  index: number,
  x: number,
  y: number,
): void {
  const anchor = findAnchor(layerId, index);
  if (!anchor || anchor.pointId) return;
  if (anchor.x === x && anchor.y === y) return;
  anchor.x = x;
  anchor.y = y;
  touch(layerOf(layerId));
}

/** Moves the mark and every route anchor glued to it. */
export function moveMarkedPoint(id: string, x: number, y: number): void {
  const point = lineStore.get().points.find((item) => item.id === id);
  if (!point || (point.x === x && point.y === y)) return;
  point.x = x;
  point.y = y;
  for (const layer of lineStore.get().layers) {
    let moved = false;
    for (const anchor of layer.anchors) {
      if (anchor.pointId !== id) continue;
      anchor.x = x;
      anchor.y = y;
      moved = true;
    }
    if (moved) layer.geometryRevision += 1;
  }
  publish();
}

export function nearestMarkedPoint(
  x: number,
  y: number,
  reach: number,
  layerId: string | null,
): MarkedPoint | null {
  if (!(reach > 0)) return null;
  const state = lineStore.get();
  const used = layerId ? pointIdsOnLayer(findLayer(state, layerId)) : null;
  let best: MarkedPoint | null = null;
  let bestDist = reach * reach;
  for (const point of state.points) {
    if (used?.has(point.id)) continue;
    const dist = distance2(point.x, point.y, x, y);
    if (dist > bestDist) continue;
    best = point;
    bestDist = dist;
  }
  return best;
}

/** Glues this anchor to an existing mark. A route keeps each mark once. */
export function attachAnchor(
  layerId: string,
  index: number,
  pointId: string,
): void {
  const layer = findLayer(lineStore.get(), layerId);
  const anchor = layer?.anchors[index];
  const point = lineStore.get().points.find((item) => item.id === pointId);
  if (!layer || !anchor || !point || anchor.pointId) return;
  if (
    layer.anchors.some(
      (item, itemIndex) => itemIndex !== index && item.pointId === pointId,
    )
  )
    return;
  anchor.pointId = pointId;
  anchor.x = point.x;
  anchor.y = point.y;
  touch(layer);
}

export function anchorMark(
  layerId: string,
  index: number | null,
): PointMark | null {
  if (index === null) return null;
  const anchor = findLayer(lineStore.get(), layerId)?.anchors[index];
  if (!anchor?.pointId) return null;
  return (
    lineStore.get().points.find((point) => point.id === anchor.pointId)?.mark ??
    null
  );
}

/** Turns this anchor into a shared mark. A nearby mark is joined instead of stacked. */
export function setAnchorMark(
  layerId: string,
  index: number,
  mark: PointMark,
  magnet: number,
): void {
  const layer = findLayer(lineStore.get(), layerId);
  const anchor = layer?.anchors[index];
  if (!layer || !anchor) return;
  if (anchor.pointId) {
    const point = lineStore
      .get()
      .points.find((item) => item.id === anchor.pointId);
    if (!point || point.mark === mark) return;
    point.mark = mark;
    publish();
    return;
  }
  const nearby = nearestMarkedPoint(anchor.x, anchor.y, magnet, layerId);
  if (nearby) {
    if (nearby.mark !== mark) nearby.mark = mark;
    anchor.pointId = nearby.id;
    const moved = anchor.x !== nearby.x || anchor.y !== nearby.y;
    anchor.x = nearby.x;
    anchor.y = nearby.y;
    if (moved) layer.geometryRevision += 1;
    publish();
    return;
  }
  const point: MarkedPoint = {
    id: nextPointId(),
    x: anchor.x,
    y: anchor.y,
    mark,
  };
  anchor.pointId = point.id;
  patch((draft) => {
    draft.points.push(point);
    draft.revision += 1;
  });
}

/** Drops this anchor off the shared mark. The mark stays while another route still uses it. */
export function clearAnchorMark(layerId: string, index: number): void {
  const anchor = findAnchor(layerId, index);
  if (!anchor?.pointId) return;
  const pointId = anchor.pointId;
  anchor.pointId = null;
  patch((draft) => {
    const points = unusedPoint(draft, pointId);
    if (points !== draft.points) draft.points = points;
    draft.revision += 1;
  });
}

export function pointOnLine(
  layerId: string,
  x: number,
  y: number,
): { index: number; x: number; y: number } | null {
  const layer = findLayer(lineStore.get(), layerId);
  if (!layer || layer.anchors.length < 2) return null;
  return closestOnLine(
    lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops,
    x,
    y,
  );
}

export function insertAnchor(
  layerId: string,
  index: number,
  x: number,
  y: number,
  magnet: number,
): void {
  const layer = findLayer(lineStore.get(), layerId);
  if (!layer) return;
  const nearby = nearestMarkedPoint(x, y, magnet, layerId);
  const at = Math.max(0, Math.min(index, layer.anchors.length));
  layer.anchors.splice(
    at,
    0,
    nearby
      ? { x: nearby.x, y: nearby.y, pointId: nearby.id }
      : { x, y, pointId: null },
  );
  layer.geometryRevision += 1;
  const hover = bumpHover(lineHoverStore.get(), layerId, at);
  batch(() => {
    patch((draft) => {
      draft.activeId = layerId;
      draft.anchorIndex = at;
      draft.revision += 1;
    });
    setLineHover(hover);
  });
}

export function deleteAnchor(layerId: string, index: number): void {
  const layer = findLayer(lineStore.get(), layerId);
  if (!layer || index < 0 || index >= layer.anchors.length) return;
  const removed = layer.anchors[index];
  layer.anchors.splice(index, 1);
  layer.geometryRevision += 1;
  const hover = shiftHover(lineHoverStore.get(), layerId, index);
  batch(() => {
    patch((draft) => {
      const points = unusedPoint(draft, removed?.pointId ?? null);
      if (points !== draft.points) draft.points = points;
      if (draft.activeId === layerId)
        draft.anchorIndex = shiftIndex(draft.anchorIndex, index);
      draft.revision += 1;
    });
    setLineHover(hover);
  });
}

export function deleteLastAnchor(): void {
  const layer = findLayer(lineStore.get(), lineStore.get().activeId);
  if (!layer || layer.anchors.length === 0) return;
  deleteAnchor(layer.id, layer.anchors.length - 1);
}

export function hitTest(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): LineHit | null {
  if (zoom <= 0 || state.layers.length === 0) return null;
  return nearestPoint(state, x, y, zoom) ?? nearestStroke(state, x, y, zoom);
}

export function findLayer(
  state: LineState,
  id: string | null,
): LineLayer | null {
  if (!id) return null;
  return state.layers.find((layer) => layer.id === id) ?? null;
}

function createLayer(kind: LineKind, layers: readonly LineLayer[]): LineLayer {
  sequence += 1;
  const count =
    layers.reduce((total, layer) => total + (layer.kind === kind ? 1 : 0), 0) +
    1;
  return {
    id: `line-${sequence}`,
    name: t(kind === "route" ? "routeName" : "boulderName", {
      n: String(count),
    }),
    kind,
    color: LINE_COLORS[layers.length % LINE_COLORS.length] ?? LINE_COLORS[0],
    anchors: [],
    scale: lineStore.get().scale,
    geometryRevision: 0,
  };
}

function touch(layer: LineLayer | null): void {
  if (!layer) return;
  layer.geometryRevision += 1;
  publish();
}

function layerOf(id: string): LineLayer | null {
  return findLayer(lineStore.get(), id);
}

function findAnchor(layerId: string, index: number): Anchor | null {
  return layerOf(layerId)?.anchors[index] ?? null;
}

function nextPointId(): string {
  pointSequence += 1;
  return `point-${pointSequence}`;
}

function pointIdsOnLayer(layer: LineLayer | null): Set<string> | null {
  if (!layer) return null;
  const ids = new Set<string>();
  for (const anchor of layer.anchors) {
    if (anchor.pointId) ids.add(anchor.pointId);
  }
  return ids;
}

function unusedPoint(state: LineState, pointId: string | null): MarkedPoint[] {
  if (!pointId) return state.points;
  for (const layer of state.layers) {
    for (const anchor of layer.anchors) {
      if (anchor.pointId === pointId) return state.points;
    }
  }
  return state.points.filter((point) => point.id !== pointId);
}

function nearestPoint(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): LineHit | null {
  const handle = HIT_PX / zoom;
  let best: { hit: LineHit; dist: number } | null = null;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer) continue;
    for (let index = layer.anchors.length - 1; index >= 0; index -= 1) {
      const anchor = layer.anchors[index];
      if (!anchor) continue;
      const limit = anchor.pointId
        ? Math.max(handle, markRadius(layer.scale) * 1.25)
        : handle;
      const dist = distance2(anchor.x, anchor.y, x, y);
      if (dist > limit * limit) continue;
      const preferActive =
        best !== null &&
        Math.abs(dist - best.dist) <= 0.01 &&
        layer.id === state.activeId;
      if (!best || dist + 0.01 < best.dist || preferActive) {
        best = { hit: { type: "anchor", layerId: layer.id, index }, dist };
      }
    }
  }
  return best?.hit ?? null;
}

function nearestStroke(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): LineHit | null {
  let bestId: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || layer.anchors.length < 2) continue;
    const tol = HIT_PX / zoom + (LINE_STROKE * layer.scale) / 2;
    const dist = strokeDistance2(layer, x, y);
    if (dist <= tol * tol && dist < bestDist) {
      bestDist = dist;
      bestId = layer.id;
    }
  }
  return bestId ? { type: "stroke", layerId: bestId } : null;
}

function strokeDistance2(layer: LineLayer, x: number, y: number): number {
  return curveDistance2(
    lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops,
    x,
    y,
  );
}

function shiftIndex(current: number | null, deleted: number): number | null {
  if (current === null) return null;
  if (current === deleted) return null;
  if (current > deleted) return current - 1;
  return current;
}

function bumpHover(
  hover: LineHit | null,
  layerId: string,
  inserted: number,
): LineHit | null {
  if (!hover || hover.layerId !== layerId || hover.type !== "anchor")
    return hover;
  if (hover.index >= inserted) return { ...hover, index: hover.index + 1 };
  return hover;
}

function shiftHover(
  hover: LineHit | null,
  layerId: string,
  deleted: number,
): LineHit | null {
  if (!hover || hover.layerId !== layerId || hover.type !== "anchor")
    return hover;
  if (hover.index === deleted) return null;
  if (hover.index > deleted) return { ...hover, index: hover.index - 1 };
  return hover;
}

function distance2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function sameHit(a: LineHit | null, b: LineHit | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.type !== b.type || a.layerId !== b.layerId) return false;
  if (a.type === "stroke" || b.type === "stroke")
    return a.type === "stroke" && b.type === "stroke";
  return a.type === "anchor" && b.type === "anchor" && a.index === b.index;
}
