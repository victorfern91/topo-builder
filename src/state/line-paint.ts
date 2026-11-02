import { Tokens } from "@ui";
import { gradePaint } from "./grade.ts";
import { dropLineGeometry, lineGeometry } from "./line-curve.ts";
import {
  CORNER_SIGN,
  findLayer,
  lineHoverStore,
  lineStore,
  markFrame,
  materialGrabStore,
  numberDragStore,
  type LineHit,
  type LineLayer,
  type LineState,
} from "./lines.ts";
import { preferencesStore } from "./preferences.ts";
import type { GradeSystem } from "./grade.ts";
import {
  dropRouteSpans,
  NUMBER_FONT,
  numberBadge,
  numberLabel,
  numberMagnet,
  routeNumberPlacement,
} from "./route-number.ts";
import { markDragStore } from "./mark-drag.ts";
import {
  drawPointMark,
  isFreeMark,
  MARK_KIND,
  markRadius,
  markSprite,
  materialReach,
  type PointMark,
} from "./point-marks.ts";
import { LINE_HALO, LINE_STROKE } from "./stroke.ts";
import { viewportStore } from "./viewport.ts";

const ANCHOR = 5;

/** Image pixels at scale 1. Each line multiplies by its scale; zoom is already in the canvas transform. */
const STROKE = LINE_STROKE;
const HALO = LINE_HALO;
const BOULDER_DASH = [14, 10];
const SELECT_BLUE = Tokens.color.blue[500];
const SELECT_PAD = 8;
const DROP_SPOT_FILL = Tokens.color.white[45];
const SELECT_FILL = Tokens.color.blue[100];

let painted = false;

/** Draws every line into a viewport-sized buffer. One transform, cached Path2D per unchanged layer. */
export function paintLines(canvas: HTMLCanvasElement): void {
  const view = viewportStore.get();
  const doc = lineStore.get();
  const visible = doc.layers.some((layer) => layer.anchors.length > 0);
  if (!visible && !painted) return;
  if (view.viewWidth < 1 || view.viewHeight < 1) return;

  const dpr = window.devicePixelRatio || 1;
  const bufferW = Math.max(1, Math.round(view.viewWidth * dpr));
  const bufferH = Math.max(1, Math.round(view.viewHeight * dpr));
  if (canvas.width !== bufferW || canvas.height !== bufferH) {
    canvas.width = bufferW;
    canvas.height = bufferH;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, bufferW, bufferH);
  if (!visible) {
    painted = false;
    dropLineGeometry(new Set());
    dropRouteSpans(new Set());
    return;
  }
  painted = true;
  const live = new Set(doc.layers.map((layer) => layer.id));
  dropLineGeometry(live);
  dropRouteSpans(live);

  ctx.setTransform(
    dpr * view.zoom,
    0,
    0,
    dpr * view.zoom,
    dpr * view.panX,
    dpr * view.panY,
  );
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const hover = lineHoverStore.get();
  const magnetId =
    numberDragStore.get() ?? (hover?.type === "number" ? hover.layerId : null);
  if (magnetId) {
    const band = findLayer(doc, magnetId);
    if (band) paintNumberBand(ctx, band);
  }
  const drag = markDragStore.get();
  if (
    materialGrabStore.get() ||
    (drag !== null && MARK_KIND[drag.mark] === "material")
  )
    paintMaterialBand(ctx, doc);
  let active: LineLayer | null = null;
  for (const layer of doc.layers) {
    if (layer.id === doc.activeId) {
      active = layer;
      paintSelection(ctx, layer);
    }
    strokeLayer(ctx, layer, true);
  }
  paintMarks(
    ctx,
    doc,
    doc.markId ?? markedId(doc, doc.activeId, doc.anchorIndex),
    hover?.type === "mark"
      ? hover.pointId
      : hover?.type === "anchor"
        ? markedId(doc, hover.layerId, hover.index)
        : null,
    view.zoom,
    dpr * view.zoom,
  );

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (drag && !isFreeMark(drag.mark))
    paintDropSpots(
      ctx,
      doc,
      drag.mark,
      drag.landing,
      view.zoom,
      view.panX,
      view.panY,
    );
  paintControls(
    ctx,
    active,
    hover,
    doc.anchorIndex,
    view.zoom,
    view.panX,
    view.panY,
  );
  paintMarkFrame(ctx, doc, hover, view.zoom, view.panX, view.panY);
  paintLineNumbers(ctx, doc.layers, hover, view.zoom, view.panX, view.panY);
}

/** Square frame with a handle on each corner around the selected characteristic. */
function paintMarkFrame(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  hover: LineHit | null,
  zoom: number,
  panX: number,
  panY: number,
): void {
  const frame = markFrame(doc, zoom);
  if (!frame) return;
  const x = panX + frame.x * zoom;
  const y = panY + frame.y * zoom;
  const half = frame.half * zoom;
  ctx.save();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.rect(x - half, y - half, half * 2, half * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = SELECT_BLUE;
  ctx.stroke();
  for (const [corner, sign] of Object.entries(CORNER_SIGN)) {
    const held = hover?.type === "markCorner" && hover.corner === corner;
    fillSquare(
      ctx,
      x + sign.x * half,
      y + sign.y * half,
      held ? ANCHOR + 2 : ANCHOR + 1,
      held ? SELECT_BLUE : Tokens.color.neutral[0],
      SELECT_BLUE,
    );
  }
  ctx.restore();
}

function paintSelection(ctx: CanvasRenderingContext2D, layer: LineLayer): void {
  if (layer.anchors.length < 2) return;
  const path = lineGeometry(
    layer.id,
    layer.geometryRevision,
    layer.anchors,
  ).path;
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineWidth = (STROKE + HALO) * layer.scale + SELECT_PAD;
  ctx.strokeStyle = SELECT_BLUE;
  ctx.stroke(path);
  ctx.restore();
}

export type LineStroke = {
  /** Image pixels. Empty is a solid line. */
  dash: number[];
  halo: string;
  haloWidth: number;
  color: string;
  width: number;
};

/** Two passes: a dark halo, then the line color on top. */
export function lineStroke(layer: LineLayer): LineStroke {
  const scale = layer.scale;
  const width = STROKE * scale;
  const graded = gradePaint(layer.grade);
  return {
    dash:
      layer.kind === "boulder"
        ? BOULDER_DASH.map((length) => length * scale)
        : [],
    halo: graded?.stroke ?? Tokens.color.black[55],
    haloWidth: width + HALO * scale,
    color: graded?.color ?? layer.color,
    width,
  };
}

function strokeLayer(
  ctx: CanvasRenderingContext2D,
  layer: LineLayer,
  fadeLocked: boolean,
): void {
  if (layer.anchors.length < 2) return;
  const path = lineGeometry(
    layer.id,
    layer.geometryRevision,
    layer.anchors,
  ).path;
  const stroke = lineStroke(layer);
  ctx.save();
  if (fadeLocked && layer.locked) ctx.globalAlpha = 0.55;
  ctx.setLineDash(stroke.dash);
  ctx.strokeStyle = stroke.halo;
  ctx.lineWidth = stroke.haloWidth;
  ctx.stroke(path);
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.stroke(path);
  ctx.restore();
}

/**
 * `deviceScale` is device pixels per image pixel. With it, each mark is a cached
 * bitmap copied at whole device pixels and marks outside the buffer are skipped.
 * Without it (exports), every mark is drawn from its SVG.
 */
function paintMarks(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  selectedId: string | null,
  hoveredId: string | null,
  zoom: number,
  deviceScale: number | null,
): void {
  if (doc.points.length === 0 || !(zoom > 0)) return;
  const view = ctx.getTransform();
  ctx.setLineDash([]);
  for (const point of doc.points) {
    const radius = markRadius(doc.scale, point.mark, point.size);
    if (!(radius > 0)) continue;
    const spriteRadius =
      deviceScale === null ? 0 : Math.round(radius * deviceScale * 2) / 2;
    const selected = point.id === selectedId;
    const sprite =
      deviceScale === null ? null : markSprite(point.mark, spriteRadius);
    const cx = view.a * point.x + view.e;
    const cy = view.d * point.y + view.f;
    if (
      sprite &&
      (cx + spriteRadius < 0 ||
        cy + spriteRadius < 0 ||
        cx - spriteRadius > ctx.canvas.width ||
        cy - spriteRadius > ctx.canvas.height)
    )
      continue;
    ctx.save();
    ctx.translate(point.x, point.y);
    if (
      (selected || point.id === hoveredId) &&
      !(selected && isFreeMark(point.mark))
    ) {
      const pad = Math.min(3 / zoom, radius * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, radius + pad, 0, Math.PI * 2);
      ctx.strokeStyle = SELECT_BLUE;
      ctx.lineWidth = Math.min((selected ? 2.5 : 1.5) / zoom, radius * 0.18);
      ctx.stroke();
    }
    if (sprite) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(
        sprite,
        Math.round(cx - sprite.width / 2),
        Math.round(cy - sprite.height / 2),
      );
    } else {
      drawPointMark(ctx, point.mark, radius);
    }
    ctx.restore();
  }
}

/**
 * Rings every route point a dragged route mark can land on, at the size it
 * lands at, and fills the ring at `landing`. Expects the device-pixel transform.
 */
function paintDropSpots(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  mark: PointMark,
  landing: { x: number; y: number } | null,
  zoom: number,
  panX: number,
  panY: number,
): void {
  const radius = Math.max(ANCHOR, markRadius(doc.scale, mark) * zoom + 2);
  ctx.save();
  ctx.beginPath();
  for (const layer of doc.layers) {
    if (layer.locked) continue;
    for (const anchor of layer.anchors) {
      const x = panX + anchor.x * zoom;
      const y = panY + anchor.y * zoom;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
  }
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = SELECT_BLUE;
  ctx.fillStyle = DROP_SPOT_FILL;
  ctx.fill();
  ctx.stroke();
  if (landing) {
    ctx.beginPath();
    ctx.arc(
      panX + landing.x * zoom,
      panY + landing.y * zoom,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.setLineDash([]);
    ctx.lineWidth = 2.5;
    ctx.fillStyle = SELECT_FILL;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function markedId(
  doc: LineState,
  layerId: string | null,
  index: number | null,
): string | null {
  if (layerId === null || index === null) return null;
  return findLayer(doc, layerId)?.anchors[index]?.pointId ?? null;
}

function paintControls(
  ctx: CanvasRenderingContext2D,
  active: LineLayer | null,
  hover: LineHit | null,
  anchorIndex: number | null,
  zoom: number,
  panX: number,
  panY: number,
): void {
  if (active && !active.locked && active.anchors.length > 0)
    paintAnchors(ctx, active, hover, anchorIndex, zoom, panX, panY);
  if (!hover || hover.type !== "anchor" || hover.layerId === active?.id) return;
  const layer = findLayer(lineStore.get(), hover.layerId);
  const anchor = layer?.anchors[hover.index];
  if (!layer || !anchor || anchor.pointId) return;
  const sx = panX + anchor.x * zoom;
  const sy = panY + anchor.y * zoom;
  fillSquare(ctx, sx, sy, ANCHOR + 2, Tokens.color.neutral[0], layer.color);
}

function paintAnchors(
  ctx: CanvasRenderingContext2D,
  layer: LineLayer,
  hover: LineHit | null,
  anchorIndex: number | null,
  zoom: number,
  panX: number,
  panY: number,
): void {
  const last = layer.anchors.length - 1;
  const hovered =
    hover?.type === "anchor" && hover.layerId === layer.id ? hover.index : -1;
  const picked = anchorIndex ?? -1;
  ctx.beginPath();
  for (let index = 0; index < layer.anchors.length; index += 1) {
    if (index === last || index === hovered) continue;
    const anchor = layer.anchors[index];
    if (!anchor || anchor.pointId) continue;
    square(ctx, panX + anchor.x * zoom, panY + anchor.y * zoom, ANCHOR);
  }
  ctx.fillStyle = Tokens.color.neutral[0];
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  const tail = layer.anchors[last];
  if (tail && !tail.pointId) {
    fillSquare(
      ctx,
      panX + tail.x * zoom,
      panY + tail.y * zoom,
      ANCHOR,
      layer.color,
      Tokens.color.neutral[950],
    );
  }
  if (hovered >= 0 && hovered !== last) {
    const anchor = layer.anchors[hovered];
    if (anchor && !anchor.pointId) {
      fillSquare(
        ctx,
        panX + anchor.x * zoom,
        panY + anchor.y * zoom,
        ANCHOR + 2,
        Tokens.color.neutral[0],
        layer.color,
      );
    }
  }
  if (picked >= 0) {
    const anchor = layer.anchors[picked];
    if (anchor && !anchor.pointId) {
      fillSquare(
        ctx,
        panX + anchor.x * zoom,
        panY + anchor.y * zoom,
        ANCHOR + 3,
        Tokens.color.neutral[0],
        layer.color,
      );
    }
  }
}

/** Draws each list number inside the magnet band. Index 0 is line 1. */
function paintLineNumbers(
  ctx: CanvasRenderingContext2D,
  layers: readonly LineLayer[],
  hover: LineHit | null,
  zoom: number,
  panX: number,
  panY: number,
): void {
  if (!(zoom > 0)) return;
  const dragged = numberDragStore.get();
  ctx.save();
  ctx.font = NUMBER_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    if (!layer) continue;
    const place = routeNumberPlacement(layer);
    if (!place) continue;
    const label = numberLabel(
      index + 1,
      layer.grade,
      preferencesStore.get().gradeSystem,
    );
    const badge = numberBadge(label);
    const x = panX + place.x * zoom;
    const y = panY + place.y * zoom;
    const held =
      dragged === layer.id ||
      (hover?.type === "number" && hover.layerId === layer.id);
    ctx.save();
    if (layer.locked) ctx.globalAlpha = 0.55;
    if (dragged === layer.id) {
      ctx.beginPath();
      ctx.moveTo(panX + place.onX * zoom, panY + place.onY * zoom);
      ctx.lineTo(x, y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = layer.color;
      ctx.stroke();
    }
    fillBadge(ctx, label, badge, x, y, held ? SELECT_BLUE : layer.color, held);
    ctx.restore();
  }
  ctx.restore();
}

export const BADGE_FILL = Tokens.color.neutral[950];
export const BADGE_TEXT = Tokens.color.neutral[0];
export const BADGE_EDGE = 1.5;

/** Pill centered on `x`, `y`. Expects `NUMBER_FONT` and centered text alignment. */
function fillBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  badge: { width: number; height: number },
  x: number,
  y: number,
  edge: string,
  held: boolean,
): void {
  ctx.beginPath();
  ctx.roundRect(
    x - badge.width / 2,
    y - badge.height / 2,
    badge.width,
    badge.height,
    badge.height / 2,
  );
  ctx.fillStyle = BADGE_FILL;
  ctx.fill();
  ctx.lineWidth = held ? 2 : BADGE_EDGE;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.fillStyle = BADGE_TEXT;
  ctx.fillText(label, x, y);
}

/**
 * Lines, marks, and numbers in image pixels, without selection or handles.
 * Marks and badges are sized as they look at a zoom of one over the draw scale.
 */
export function paintArtwork(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  system: GradeSystem,
): void {
  const ink = exportInk(doc);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const layer of doc.layers) strokeLayer(ctx, layer, false);
  paintMarks(ctx, doc, null, null, 1 / ink, null);
  ctx.setLineDash([]);
  ctx.font = NUMBER_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let index = 0; index < doc.layers.length; index += 1) {
    const layer = doc.layers[index];
    if (!layer) continue;
    const place = routeNumberPlacement(layer);
    if (!place) continue;
    const label = numberLabel(index + 1, layer.grade, system);
    ctx.save();
    ctx.translate(place.x, place.y);
    ctx.scale(ink, ink);
    fillBadge(ctx, label, numberBadge(label), 0, 0, layer.color, false);
    ctx.restore();
  }
  ctx.restore();
}

/** Image pixels per screen pixel for marks and badges in an export. */
export function exportInk(doc: LineState): number {
  return doc.scale > 0 && Number.isFinite(doc.scale) ? doc.scale : 1;
}

function paintNumberBand(
  ctx: CanvasRenderingContext2D,
  layer: LineLayer,
): void {
  if (layer.anchors.length < 2) return;
  const path = lineGeometry(
    layer.id,
    layer.geometryRevision,
    layer.anchors,
  ).path;
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineWidth = numberMagnet().reach * 2;
  ctx.strokeStyle = layer.color;
  ctx.globalAlpha = 0.18;
  ctx.stroke(path);
  ctx.restore();
}

/** Shades the band beside every route where free material can land. */
function paintMaterialBand(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
): void {
  const reach = materialReach(doc.scale);
  if (!(reach > 0)) return;
  ctx.save();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = SELECT_BLUE;
  ctx.fillStyle = SELECT_BLUE;
  ctx.lineWidth = reach * 2;
  for (const layer of doc.layers) {
    const lone = layer.anchors.length === 1 ? layer.anchors[0] : null;
    if (lone) {
      ctx.beginPath();
      ctx.arc(lone.x, lone.y, reach, 0, Math.PI * 2);
      ctx.fill();
    } else if (layer.anchors.length >= 2) {
      ctx.stroke(
        lineGeometry(layer.id, layer.geometryRevision, layer.anchors).path,
      );
    }
  }
  ctx.restore();
}

function fillSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string,
): void {
  ctx.beginPath();
  square(ctx, x, y, size);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
}

function square(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const half = size / 2;
  ctx.rect(x - half, y - half, size, size);
}
