import { batch, Store } from "@tanstack/store";
import { produce, setAutoFreeze } from "immer";
import { t } from "../i18n/index.ts";
import {
  clearLineGeometry,
  closestOnLine,
  curveDistance2,
  lineGeometry,
} from "./line-curve.ts";
import {
  beginHistory,
  bindLineHistory,
  endHistory,
  resetHistory,
  type LineCheckpoint,
} from "./history.ts";
import { gradePaint } from "./grade.ts";
import {
  canStandFree,
  clampMarkSize,
  isFreeMark,
  magnetReach,
  markRadius,
  materialReach,
  type PointMark,
} from "./point-marks.ts";
import { preferencesStore } from "./preferences.ts";
import { LINE_STROKE } from "./stroke.ts";
import {
  clearRouteNumberCache,
  defaultRouteNumber,
  insideNumberBadge,
  numberBadge,
  numberFromPointer,
  numberLabel,
  readRouteNumber,
  routeNumberPlacement,
  type RouteNumber,
} from "./route-number.ts";
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
  /** Multiplier on the draw size. Characteristics change it from their frame; route marks keep 1. */
  size: number;
};

/** A corner of a characteristic's frame. */
export type MarkCorner = "nw" | "ne" | "se" | "sw";

/** Screen pixels between a characteristic and its frame. */
const FRAME_PAD = 4;

/** Center and half side, in image pixels, of the frame around a selected characteristic. */
export type MarkFrame = { pointId: string; x: number; y: number; half: number };

/** Same bounds as the zoom slider, so a given percent sits in the same place on both. */
export const DRAW_SCALE_MIN = MIN_ZOOM;
export const DRAW_SCALE_MAX = MAX_ZOOM;
export const DEFAULT_DRAW_SCALE = 1;

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
  /** Locked lines stay visible and keep their number. Geometry edits are refused. */
  locked: boolean;
  /** Null hides the list number. A value sits in the magnet band beside the route. */
  routeNumber: RouteNumber | null;
  /** Index into the grade scale. Null until a route grade is chosen. */
  grade: number | null;
};

export type LineHit =
  | { type: "anchor"; layerId: string; index: number }
  | { type: "stroke"; layerId: string }
  | { type: "number"; layerId: string }
  | { type: "mark"; pointId: string }
  | { type: "markCorner"; pointId: string; corner: MarkCorner };

/** Where a mark lands. Image pixels. */
export type MarkLanding =
  | { type: "anchor"; layerId: string; index: number }
  | { type: "line"; layerId: string; index: number; x: number; y: number }
  | { type: "free"; x: number; y: number };

export type LineState = {
  /** Back to front. Index 0 is line 1 in the layers list and on the photo. */
  layers: LineLayer[];
  activeId: string | null;
  /** Anchor chosen on the active line. Delete and the point menu use it. */
  anchorIndex: number | null;
  /** Free mark chosen on the photo. Delete uses it. */
  markId: string | null;
  /** Scale the top bar writes onto every line, and that new lines copy. */
  scale: number;
  /** Annotations routes can share. Anchors reference these by id; free marks stand alone. */
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
  markId: null,
  scale: DEFAULT_DRAW_SCALE,
  points: [],
  revision: 0,
});

/** Pointer target. Its own store so a hover does not publish the line document. */
export const lineHoverStore = new Store<LineHit | null>(null);

/** Layer whose route number is being dragged. Drives the magnet band. */
export const numberDragStore = new Store<string | null>(null);

/** True while a placed free material is held. Drives the material band. */
export const materialGrabStore = new Store(false);

function patch(recipe: (draft: LineState) => void): void {
  lineStore.setState((state) => produce(state, recipe));
}

/** Notifies canvas subscribers. The layer list keeps its identity. */
function publish(): void {
  patch((draft) => {
    draft.revision += 1;
  });
}

/** One undo step. Nested calls join the step a pointer gesture already opened. */
function edit<T>(run: () => T, coalesceKey?: string): T {
  beginHistory(coalesceKey);
  try {
    return run();
  } finally {
    endHistory();
  }
}

export function beginLine(kind: LineKind): string {
  return edit(() => {
    const layer = createLayer(kind, lineStore.get().layers);
    patch((draft) => {
      draft.layers.push(layer);
      draft.activeId = layer.id;
      draft.anchorIndex = null;
      draft.markId = null;
      draft.revision += 1;
    });
    return layer.id;
  });
}

export function ensureLine(kind: LineKind): string {
  const state = lineStore.get();
  const active = findLayer(state, state.activeId);
  if (active && !active.locked) return active.id;
  return beginLine(kind);
}

/** Keeps the geometry and clears the selection. */
export function finishLine(): void {
  batch(() => {
    patch((draft) => {
      if (
        draft.activeId === null &&
        draft.anchorIndex === null &&
        draft.markId === null
      )
        return;
      draft.activeId = null;
      draft.anchorIndex = null;
      draft.markId = null;
    });
    setLineHover(null);
  });
}

export function selectLine(id: string): void {
  patch((draft) => {
    if (!findLayer(draft, id)) return;
    if (
      draft.activeId === id &&
      draft.anchorIndex === null &&
      draft.markId === null
    )
      return;
    draft.activeId = id;
    draft.anchorIndex = null;
    draft.markId = null;
  });
}

export function selectAnchor(layerId: string, index: number): void {
  patch((draft) => {
    const layer = findLayer(draft, layerId);
    if (!layer || !layer.anchors[index]) return;
    if (
      draft.activeId === layerId &&
      draft.anchorIndex === index &&
      draft.markId === null
    )
      return;
    draft.activeId = layerId;
    draft.anchorIndex = index;
    draft.markId = null;
  });
}

/** Selects a free mark and clears the line selection. */
export function selectMark(id: string): void {
  patch((draft) => {
    if (!draft.points.some((point) => point.id === id)) return;
    if (draft.markId === id && draft.activeId === null) return;
    draft.activeId = null;
    draft.anchorIndex = null;
    draft.markId = id;
  });
}

/** Places a characteristic or material on the photo, off every route point, and selects it. */
export function addFreeMark(
  mark: PointMark,
  x: number,
  y: number,
  size = 1,
): void {
  if (!canStandFree(mark)) return;
  edit(() => {
    const point: MarkedPoint = {
      id: nextPointId(),
      x,
      y,
      mark,
      size: clampMarkSize(size),
    };
    patch((draft) => {
      draft.points.push(point);
      draft.activeId = null;
      draft.anchorIndex = null;
      draft.markId = point.id;
      draft.revision += 1;
    });
  });
}

/** Removes the mark and turns every anchor glued to it back into a plain point. */
export function deleteMark(id: string): void {
  edit(() => {
    const state = lineStore.get();
    if (!state.points.some((point) => point.id === id)) return;
    for (const layer of state.layers) {
      if (layer.locked && layer.anchors.some((a) => a.pointId === id)) return;
    }
    for (const layer of state.layers) {
      let changed = false;
      for (const anchor of layer.anchors) {
        if (anchor.pointId !== id) continue;
        anchor.pointId = null;
        changed = true;
      }
      if (changed) layer.geometryRevision += 1;
    }
    batch(() => {
      patch((draft) => {
        draft.points = draft.points.filter((point) => point.id !== id);
        if (draft.markId === id) draft.markId = null;
        draft.revision += 1;
      });
      const hover = lineHoverStore.get();
      if (hover?.type === "mark" && hover.pointId === id) setLineHover(null);
    });
  });
}

export function setLineColor(id: string, color: LineColor): void {
  edit(() => {
    patch((draft) => {
      const layer = draft.layers.find((item) => item.id === id);
      if (!layer || layer.locked || layer.color === color) return;
      layer.color = color;
      draft.revision += 1;
    });
  });
}

/** Paints the route with that grade's fill and outline. Boulders ignore it. */
export function setLineGrade(id: string, grade: number): void {
  edit(() => {
    const paint = gradePaint(grade);
    patch((draft) => {
      const layer = draft.layers.find((item) => item.id === id);
      if (!layer || layer.locked || layer.kind !== "route" || !paint) return;
      if (layer.grade === grade && layer.color === paint.color) return;
      layer.grade = grade;
      layer.color = paint.color;
      draft.revision += 1;
    });
  });
}

export function renameLine(id: string, name: string): void {
  edit(() => {
    patch((draft) => {
      const layer = draft.layers.find((item) => item.id === id);
      if (!layer || layer.locked || layer.name === name) return;
      layer.name = name;
      draft.revision += 1;
    });
  });
}

export function toggleLineLock(id: string): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), id);
    if (!layer) return;
    const next = !layer.locked;
    batch(() => {
      patch((draft) => {
        const item = findLayer(draft, id);
        if (!item) return;
        item.locked = next;
        draft.revision += 1;
      });
      const hover = lineHoverStore.get();
      if (next && hitLayerId(hover) === id) setLineHover(null);
    });
  });
}

export function deleteLine(id: string): void {
  edit(() => deleteLineNow(id));
}

function deleteLineNow(id: string): void {
  const state = lineStore.get();
  const index = state.layers.findIndex((layer) => layer.id === id);
  const layer = state.layers[index];
  if (!layer) return;
  const removedPoints = new Set<string>();
  for (const anchor of layer.anchors) {
    if (anchor.pointId) removedPoints.add(anchor.pointId);
  }
  batch(() => {
    patch((draft) => {
      draft.layers.splice(index, 1);
      if (removedPoints.size > 0) {
        const used = new Set<string>();
        for (const item of draft.layers) {
          for (const anchor of item.anchors) {
            if (anchor.pointId) used.add(anchor.pointId);
          }
        }
        draft.points = draft.points.filter(
          (point) => !removedPoints.has(point.id) || used.has(point.id),
        );
      }
      if (draft.activeId === id) {
        const next = draft.layers[index] ?? draft.layers[index - 1] ?? null;
        draft.activeId = next?.id ?? null;
        draft.anchorIndex = null;
      }
      draft.revision += 1;
    });
    const hover = lineHoverStore.get();
    if (hitLayerId(hover) === id) setLineHover(null);
  });
}

/** Inserts an unlocked duplicate just after the source, so it takes the next number. */
export function copyLine(id: string): string | null {
  return edit(() => copyLineNow(id));
}

function copyLineNow(id: string): string | null {
  const state = lineStore.get();
  const index = state.layers.findIndex((layer) => layer.id === id);
  const source = state.layers[index];
  if (!source) return null;
  sequence += 1;
  const copyId = `line-${sequence}`;
  const clones = new Map<string, MarkedPoint>();
  const anchors = source.anchors.map((anchor) => {
    if (!anchor.pointId) return { x: anchor.x, y: anchor.y, pointId: null };
    const existing = clones.get(anchor.pointId);
    if (existing) return { x: anchor.x, y: anchor.y, pointId: existing.id };
    const point = state.points.find((item) => item.id === anchor.pointId);
    if (!point) return { x: anchor.x, y: anchor.y, pointId: null };
    pointSequence += 1;
    const clone: MarkedPoint = {
      id: `point-${pointSequence}`,
      x: point.x,
      y: point.y,
      mark: point.mark,
      size: point.size,
    };
    clones.set(anchor.pointId, clone);
    return { x: anchor.x, y: anchor.y, pointId: clone.id };
  });
  const copy: LineLayer = {
    id: copyId,
    name: t("layerCopyName", { name: source.name }),
    kind: source.kind,
    color: source.color,
    anchors,
    scale: source.scale,
    geometryRevision: 0,
    locked: false,
    routeNumber: source.routeNumber
      ? { t: source.routeNumber.t, side: source.routeNumber.side }
      : null,
    grade: source.grade ?? null,
  };
  patch((draft) => {
    draft.layers.splice(index + 1, 0, copy);
    for (const point of clones.values()) draft.points.push(point);
    draft.activeId = copyId;
    draft.anchorIndex = null;
    draft.revision += 1;
  });
  return copyId;
}

/**
 * Moves a layer to `toIndex`. Index 0 stays at the back and is line 1.
 * The number on the photo follows the list.
 */
export function moveLine(id: string, toIndex: number): void {
  edit(() => {
    patch((draft) => {
      const from = draft.layers.findIndex((layer) => layer.id === id);
      if (from < 0 || !Number.isInteger(toIndex)) return;
      const to = Math.min(draft.layers.length - 1, Math.max(0, toIndex));
      if (from === to) return;
      const [layer] = draft.layers.splice(from, 1);
      if (!layer) return;
      draft.layers.splice(to, 0, layer);
      draft.revision += 1;
    });
  });
}

/**
 * Sets the drawing scale and writes it onto every line so they stay the same size on the photo.
 * Scale is written on the live layers. The layers array keeps its identity, so the list does not re-render.
 */
export function setDrawScale(scale: number): void {
  edit(() => {
    const next = clampDrawScale(scale);
    const state = lineStore.get();
    let changed = state.scale !== next;
    for (const layer of state.layers) {
      if (layer.scale === next) continue;
      layer.scale = next;
      changed = true;
    }
    if (!changed) return;
    lineStore.setState((current) => ({
      ...current,
      scale: next,
      revision: current.revision + 1,
    }));
  }, "scale");
}

export function clearLines(): void {
  resetHistory();
  batch(() => {
    patch((draft) => {
      if (
        draft.layers.length === 0 &&
        draft.points.length === 0 &&
        draft.activeId === null &&
        draft.anchorIndex === null &&
        draft.markId === null
      )
        return;
      draft.layers = [];
      draft.points = [];
      draft.activeId = null;
      draft.anchorIndex = null;
      draft.markId = null;
      draft.revision += 1;
    });
    setLineHover(null);
  });
}

/** Replaces the drawing with a saved one and starts a blank history. */
export function loadDrawing(
  drawing: Pick<LineCheckpoint, "layers" | "points" | "scale">,
): void {
  resetHistory();
  applyCheckpoint({ ...drawing, activeId: null, anchorIndex: null });
}

export function setLineHover(hover: LineHit | null): void {
  lineHoverStore.setState((current) =>
    sameHit(current, hover) ? current : hover,
  );
}

export function setMaterialGrab(held: boolean): void {
  materialGrabStore.setState((current) => (current === held ? current : held));
}

export function setNumberDrag(layerId: string | null): void {
  numberDragStore.setState((current) =>
    current === layerId ? current : layerId,
  );
}

/** Appends a corner. Mutates the layer list in place so the table does not re-render. */
export function appendAnchor(layerId: string, x: number, y: number): number {
  return edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked) return -1;
    const opening = layer.anchors.length < 2;
    layer.anchors.push({ x, y, pointId: null });
    if (opening && layer.anchors.length >= 2 && layer.routeNumber == null) {
      layer.routeNumber = defaultRouteNumber();
    }
    touch(layer);
    return layer.anchors.length - 1;
  });
}

/** Slides the badge along the route and keeps it inside the magnet band. */
export function moveRouteNumber(layerId: string, x: number, y: number): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    const current = layer ? readRouteNumber(layer) : null;
    if (!layer || layer.locked || !current) return;
    const next = numberFromPointer(layer, x, y, current.side);
    if (!next || sameNumber(layer.routeNumber, next)) return;
    layer.routeNumber = next;
    publish();
  }, `number:${layerId}`);
}

/** Places the list number where the pointer sits inside the magnet band. */
export function addRouteNumber(layerId: string, x: number, y: number): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked || layer.anchors.length < 2 || layer.routeNumber)
      return;
    const next = numberFromPointer(layer, x, y, 1);
    if (!next) return;
    layer.routeNumber = next;
    publish();
  });
}

export function clearRouteNumber(layerId: string): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked || !layer.routeNumber) return;
    layer.routeNumber = null;
    publish();
  });
}

/** Moves a plain anchor. Shared marks move through `moveMarkedPoint`. */
export function placeAnchor(
  layerId: string,
  index: number,
  x: number,
  y: number,
): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    const anchor = layer?.anchors[index];
    if (!layer || layer.locked || !anchor || anchor.pointId) return;
    if (anchor.x === x && anchor.y === y) return;
    anchor.x = x;
    anchor.y = y;
    touch(layer);
  });
}

/** Moves the mark and every route anchor glued to it. */
export function moveMarkedPoint(id: string, x: number, y: number): void {
  edit(() => {
    const point = lineStore.get().points.find((item) => item.id === id);
    if (!point || (point.x === x && point.y === y)) return;
    for (const layer of lineStore.get().layers) {
      if (!layer.locked) continue;
      if (layer.anchors.some((anchor) => anchor.pointId === id)) return;
    }
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
  });
}

/** Sets a free characteristic's size and center. */
export function resizeMark(
  id: string,
  x: number,
  y: number,
  size: number,
): void {
  edit(() => {
    const point = lineStore.get().points.find((item) => item.id === id);
    if (!point || !isFreeMark(point.mark)) return;
    const next = clampMarkSize(size);
    if (point.size === next && point.x === x && point.y === y) return;
    point.size = next;
    point.x = x;
    point.y = y;
    publish();
  });
}

/** Frame around the selected characteristic. Null when none is selected. */
export function markFrame(state: LineState, zoom: number): MarkFrame | null {
  if (state.markId === null || !(zoom > 0)) return null;
  const point = state.points.find((item) => item.id === state.markId);
  if (!point || !isFreeMark(point.mark)) return null;
  return {
    pointId: point.id,
    x: point.x,
    y: point.y,
    half: markRadius(state.scale, point.mark, point.size) + framePad(zoom),
  };
}

/** Image pixels between a characteristic's frame and its drawn edge. */
export function framePad(zoom: number): number {
  return zoom > 0 ? FRAME_PAD / zoom : 0;
}

/** Unit direction of each frame corner from the center. */
export const CORNER_SIGN = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
} as const satisfies Record<MarkCorner, { x: number; y: number }>;

const MARK_CORNERS = ["nw", "ne", "se", "sw"] as const;

function markCornerAt(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): Extract<LineHit, { type: "markCorner" }> | null {
  const frame = markFrame(state, zoom);
  if (!frame) return null;
  const reach = HIT_PX / zoom;
  for (const corner of MARK_CORNERS) {
    const sign = CORNER_SIGN[corner];
    const cx = frame.x + sign.x * frame.half;
    const cy = frame.y + sign.y * frame.half;
    if (Math.abs(x - cx) <= reach && Math.abs(y - cy) <= reach)
      return { type: "markCorner", pointId: frame.pointId, corner };
  }
  return null;
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
  const attached = attachedPointIds(state);
  let best: MarkedPoint | null = null;
  let bestDist = reach * reach;
  for (const point of state.points) {
    if (used?.has(point.id) || !attached.has(point.id)) continue;
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
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    const anchor = layer?.anchors[index];
    const point = lineStore.get().points.find((item) => item.id === pointId);
    if (!layer || layer.locked || !anchor || !point || anchor.pointId) return;
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
  });
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
  if (isFreeMark(mark)) return;
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    const anchor = layer?.anchors[index];
    if (!layer || layer.locked || !anchor) return;
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
      size: 1,
    };
    anchor.pointId = point.id;
    patch((draft) => {
      draft.points.push(point);
      draft.revision += 1;
    });
  });
}

/** Drops this anchor off the shared mark. The mark stays while another route still uses it. */
export function clearAnchorMark(layerId: string, index: number): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    const anchor = layer?.anchors[index];
    if (!layer || layer.locked || !anchor?.pointId) return;
    const pointId = anchor.pointId;
    anchor.pointId = null;
    patch((draft) => {
      const points = unusedPoint(draft, pointId);
      if (points !== draft.points) draft.points = points;
      draft.revision += 1;
    });
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

/** Nearest spot on an unlocked line within `reach`, with the anchor index it would take. */
export function lineAt(
  state: LineState,
  x: number,
  y: number,
  reach: number,
): { layerId: string; index: number; x: number; y: number } | null {
  let best: { layerId: string; index: number; x: number; y: number } | null =
    null;
  let bestDist = reach * reach;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || layer.locked || layer.anchors.length < 2) continue;
    const spot = closestOnLine(
      lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops,
      x,
      y,
    );
    if (!spot) continue;
    const dist = distance2(spot.x, spot.y, x, y);
    if (dist >= bestDist) continue;
    best = { layerId: layer.id, ...spot };
    bestDist = dist;
  }
  return best;
}

/**
 * Where material aimed at (x, y) lands: the route point under the pointer, the
 * line inside the magnet, or free inside the band beside a route. Null beyond it.
 */
export function materialLanding(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): MarkLanding | null {
  const anchor = anchorAt(state, x, y, zoom);
  if (anchor) return anchor;
  const spot = lineAt(state, x, y, magnetReach(zoom, state.scale));
  if (spot) return { type: "line", ...spot };
  const near = closestOnRoutes(state, x, y);
  const reach = materialReach(state.scale);
  return near && near.dist <= reach * reach ? { type: "free", x, y } : null;
}

/** (x, y) pulled back inside the material band. Null with no route on the photo. */
export function insideMaterialBand(
  state: LineState,
  x: number,
  y: number,
): { x: number; y: number } | null {
  const near = closestOnRoutes(state, x, y);
  if (!near) return null;
  const reach = materialReach(state.scale);
  if (near.dist <= reach * reach) return { x, y };
  const pull = reach / Math.sqrt(near.dist);
  return {
    x: near.x + (x - near.x) * pull,
    y: near.y + (y - near.y) * pull,
  };
}

/** Moves a free mark onto a route point or the line. Joins the open undo step. */
export function landFreeMark(
  id: string,
  landing: Exclude<MarkLanding, { type: "free" }>,
  magnet: number,
): void {
  edit(() => {
    const point = lineStore.get().points.find((item) => item.id === id);
    if (!point || isFreeMark(point.mark)) return;
    const mark = point.mark;
    deleteMark(id);
    if (landing.type === "line")
      markOnLine(landing.layerId, landing.index, landing.x, landing.y, mark);
    else setAnchorMark(landing.layerId, landing.index, mark, magnet);
  });
}

/** Adds a route point on the line at `index` and puts the mark on it. One undo step. */
export function markOnLine(
  layerId: string,
  index: number,
  x: number,
  y: number,
  mark: PointMark,
): void {
  edit(() => {
    const before = findLayer(lineStore.get(), layerId)?.anchors.length ?? 0;
    insertAnchor(layerId, index, x, y, 0);
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.anchors.length === before) return;
    setAnchorMark(layerId, Math.max(0, Math.min(index, before)), mark, 0);
  });
}

export function insertAnchor(
  layerId: string,
  index: number,
  x: number,
  y: number,
  magnet: number,
): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked) return;
    const opening = layer.anchors.length < 2;
    const nearby = nearestMarkedPoint(x, y, magnet, layerId);
    const at = Math.max(0, Math.min(index, layer.anchors.length));
    layer.anchors.splice(
      at,
      0,
      nearby
        ? { x: nearby.x, y: nearby.y, pointId: nearby.id }
        : { x, y, pointId: null },
    );
    if (opening && layer.anchors.length >= 2 && layer.routeNumber == null) {
      layer.routeNumber = defaultRouteNumber();
    }
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
  });
}

export function deleteAnchor(layerId: string, index: number): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked || index < 0 || index >= layer.anchors.length)
      return;
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
  if (zoom <= 0) return null;
  const corner = markCornerAt(state, x, y, zoom);
  if (corner) return corner;
  let best: { hit: LineHit; dist: number } | null = null;
  for (const near of [
    nearestNumber(state, x, y, zoom),
    nearestPoint(state, x, y, zoom),
    nearestFreeMark(state, x, y, zoom),
  ]) {
    if (near && (!best || near.dist < best.dist)) best = near;
  }
  return best?.hit ?? nearestStroke(state, x, y, zoom);
}

function nearestFreeMark(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): { hit: LineHit; dist: number } | null {
  const handle = HIT_PX / zoom;
  const attached = attachedPointIds(state);
  let best: { hit: LineHit; dist: number } | null = null;
  for (const point of state.points) {
    if (attached.has(point.id)) continue;
    const limit = Math.max(
      handle,
      markRadius(state.scale, point.mark, point.size) * 1.1,
    );
    const dist = distance2(point.x, point.y, x, y);
    if (dist > limit * limit || (best && dist >= best.dist)) continue;
    best = { hit: { type: "mark", pointId: point.id }, dist };
  }
  return best;
}

/** Nearest unlocked route anchor under the pointer, ignoring numbers and strokes. */
export function anchorAt(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): Extract<LineHit, { type: "anchor" }> | null {
  if (zoom <= 0) return null;
  const hit = nearestPoint(state, x, y, zoom)?.hit;
  return hit?.type === "anchor" ? hit : null;
}

/** Mark on the selected anchor. Null when no anchor is selected or it is plain. */
export function selectedAnchorMark(state: LineState): PointMark | null {
  if (state.activeId === null || state.anchorIndex === null) return null;
  const pointId = findLayer(state, state.activeId)?.anchors[state.anchorIndex]
    ?.pointId;
  if (!pointId) return null;
  return state.points.find((point) => point.id === pointId)?.mark ?? null;
}

/** Sets this mark on the anchor, or clears it when the anchor already has it. */
export function toggleAnchorMark(
  layerId: string,
  index: number,
  mark: PointMark,
  magnet: number,
): void {
  if (anchorMark(layerId, index) === mark) clearAnchorMark(layerId, index);
  else setAnchorMark(layerId, index, mark, magnet);
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
  return {
    id: `line-${sequence}`,
    name: t(kind === "route" ? "routeKind" : "boulderKind"),
    kind,
    color: LINE_COLORS[layers.length % LINE_COLORS.length] ?? LINE_COLORS[0],
    anchors: [],
    scale: lineStore.get().scale,
    geometryRevision: 0,
    locked: false,
    routeNumber: null,
    grade: null,
  };
}

function touch(layer: LineLayer | null): void {
  if (!layer) return;
  layer.geometryRevision += 1;
  publish();
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

/** Marks a route point uses. The others stand free on the photo. */
function attachedPointIds(state: LineState): Set<string> {
  const ids = new Set<string>();
  for (const layer of state.layers) {
    for (const anchor of layer.anchors) {
      if (anchor.pointId) ids.add(anchor.pointId);
    }
  }
  return ids;
}

/** Closest spot on any route, locked ones included, with its squared distance. */
function closestOnRoutes(
  state: LineState,
  x: number,
  y: number,
): { x: number; y: number; dist: number } | null {
  let best: { x: number; y: number; dist: number } | null = null;
  for (const layer of state.layers) {
    const spot =
      layer.anchors.length >= 2
        ? closestOnLine(
            lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops,
            x,
            y,
          )
        : (layer.anchors[0] ?? null);
    if (!spot) continue;
    const dist = distance2(spot.x, spot.y, x, y);
    if (!best || dist < best.dist) best = { x: spot.x, y: spot.y, dist };
  }
  return best;
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

function nearestNumber(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): { hit: LineHit; dist: number } | null {
  if (!(zoom > 0)) return null;
  let best: { hit: LineHit; dist: number } | null = null;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || layer.locked) continue;
    const place = routeNumberPlacement(layer);
    if (!place) continue;
    const badge = numberBadge(
      numberLabel(
        layerIndex + 1,
        layer.grade,
        preferencesStore.get().gradeSystem,
      ),
    );
    const dx = (x - place.x) * zoom;
    const dy = (y - place.y) * zoom;
    if (!insideNumberBadge(dx, dy, badge.width, badge.height)) continue;
    const dist = distance2(place.x, place.y, x, y);
    if (!best || dist < best.dist) {
      best = { hit: { type: "number", layerId: layer.id }, dist };
    }
  }
  return best;
}

function nearestPoint(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): { hit: LineHit; dist: number } | null {
  const handle = HIT_PX / zoom;
  const marks = new Map(state.points.map((point) => [point.id, point.mark]));
  let best: { hit: LineHit; dist: number } | null = null;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || layer.locked) continue;
    for (let index = layer.anchors.length - 1; index >= 0; index -= 1) {
      const anchor = layer.anchors[index];
      if (!anchor) continue;
      const mark = anchor.pointId ? marks.get(anchor.pointId) : undefined;
      const limit = mark
        ? Math.max(handle, markRadius(layer.scale, mark) * 1.25)
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
  return best;
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
    if (!layer || layer.locked || layer.anchors.length < 2) continue;
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
  if (!hover || hover.type !== "anchor" || hover.layerId !== layerId)
    return hover;
  if (hover.index >= inserted) return { ...hover, index: hover.index + 1 };
  return hover;
}

function shiftHover(
  hover: LineHit | null,
  layerId: string,
  deleted: number,
): LineHit | null {
  if (!hover || hover.type !== "anchor" || hover.layerId !== layerId)
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

function sameNumber(a: RouteNumber | null, b: RouteNumber): boolean {
  return a !== null && a.t === b.t && a.side === b.side;
}

function sameHit(a: LineHit | null, b: LineHit | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.type !== b.type || hitLayerId(a) !== hitLayerId(b))
    return false;
  if (a.type === "anchor" && b.type === "anchor") return a.index === b.index;
  if (a.type === "mark" && b.type === "mark") return a.pointId === b.pointId;
  if (a.type === "markCorner" && b.type === "markCorner")
    return a.pointId === b.pointId && a.corner === b.corner;
  return true;
}

/** Line under the hit. Null for a free mark. */
export function hitLayerId(hit: LineHit | null): string | null {
  if (!hit || hit.type === "mark" || hit.type === "markCorner") return null;
  return hit.layerId;
}

function takeCheckpoint(): LineCheckpoint {
  const state = lineStore.get();
  return {
    layers: state.layers.map(cloneLayer),
    points: state.points.map(clonePoint),
    scale: state.scale,
    activeId: state.activeId,
    anchorIndex: state.anchorIndex,
  };
}

function applyCheckpoint(checkpoint: LineCheckpoint): void {
  adoptSequences(checkpoint);
  clearLineGeometry();
  clearRouteNumberCache();
  const layers = checkpoint.layers.map(cloneLayer);
  const points = checkpoint.points.map(clonePoint);
  batch(() => {
    lineStore.setState((state) => ({
      layers,
      points,
      scale: checkpoint.scale,
      activeId: checkpoint.activeId,
      anchorIndex: checkpoint.anchorIndex,
      markId: null,
      revision: state.revision + 1,
    }));
    setLineHover(null);
  });
}

function sameCheckpoint(checkpoint: LineCheckpoint): boolean {
  const state = lineStore.get();
  if (checkpoint.scale !== state.scale) return false;
  if (!samePoints(checkpoint.points, state.points)) return false;
  if (checkpoint.layers.length !== state.layers.length) return false;
  for (let index = 0; index < checkpoint.layers.length; index += 1) {
    const saved = checkpoint.layers[index];
    const live = state.layers[index];
    if (!saved || !live || !sameLayer(saved, live)) return false;
  }
  return true;
}

function cloneLayer(layer: LineLayer): LineLayer {
  return {
    id: layer.id,
    name: layer.name,
    kind: layer.kind,
    color: layer.color,
    anchors: layer.anchors.map(cloneAnchor),
    scale: layer.scale,
    geometryRevision: layer.geometryRevision,
    locked: layer.locked,
    routeNumber: layer.routeNumber
      ? { t: layer.routeNumber.t, side: layer.routeNumber.side }
      : null,
    grade: layer.grade ?? null,
  };
}

function cloneAnchor(anchor: Anchor): Anchor {
  return { x: anchor.x, y: anchor.y, pointId: anchor.pointId };
}

function clonePoint(point: MarkedPoint): MarkedPoint {
  return {
    id: point.id,
    x: point.x,
    y: point.y,
    mark: point.mark,
    size: point.size,
  };
}

function sameLayer(saved: LineLayer, live: LineLayer): boolean {
  if (
    saved.id !== live.id ||
    saved.name !== live.name ||
    saved.kind !== live.kind ||
    saved.color !== live.color ||
    saved.scale !== live.scale ||
    saved.locked !== live.locked ||
    (saved.grade ?? null) !== (live.grade ?? null) ||
    !sameRouteNumber(saved.routeNumber, live.routeNumber) ||
    saved.anchors.length !== live.anchors.length
  ) {
    return false;
  }
  for (let index = 0; index < saved.anchors.length; index += 1) {
    const left = saved.anchors[index];
    const right = live.anchors[index];
    if (
      !left ||
      !right ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.pointId !== right.pointId
    ) {
      return false;
    }
  }
  return true;
}

function samePoints(
  saved: readonly MarkedPoint[],
  live: readonly MarkedPoint[],
): boolean {
  if (saved.length !== live.length) return false;
  for (let index = 0; index < saved.length; index += 1) {
    const left = saved[index];
    const right = live[index];
    if (
      !left ||
      !right ||
      left.id !== right.id ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.mark !== right.mark ||
      left.size !== right.size
    ) {
      return false;
    }
  }
  return true;
}

function sameRouteNumber(
  a: RouteNumber | null,
  b: RouteNumber | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.t === b.t && a.side === b.side;
}

function adoptSequences(checkpoint: LineCheckpoint): void {
  for (const layer of checkpoint.layers) {
    const lineId = trailingId(layer.id);
    if (lineId > sequence) sequence = lineId;
    for (const anchor of layer.anchors) {
      if (!anchor.pointId) continue;
      const pointId = trailingId(anchor.pointId);
      if (pointId > pointSequence) pointSequence = pointId;
    }
  }
  for (const point of checkpoint.points) {
    const pointId = trailingId(point.id);
    if (pointId > pointSequence) pointSequence = pointId;
  }
}

function trailingId(id: string): number {
  const dash = id.lastIndexOf("-");
  if (dash < 0) return 0;
  const value = Number(id.slice(dash + 1));
  return Number.isInteger(value) && value > 0 ? value : 0;
}

bindLineHistory({
  read: takeCheckpoint,
  write: applyCheckpoint,
  same: sameCheckpoint,
});
