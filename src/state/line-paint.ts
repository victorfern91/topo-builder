import { Tokens } from "@ui";
import { dropLineGeometry, lineGeometry } from "./line-curve.ts";
import {
  findLayer,
  LINE_STROKE,
  lineHoverStore,
  lineStore,
  type LineHit,
  type LineLayer,
  type LineState,
} from "./lines.ts";
import { drawPointMark, markRadius } from "./point-marks.ts";
import { viewportStore } from "./viewport.ts";

const ANCHOR = 5;

/** Image pixels at scale 1. Each line multiplies by its scale; zoom is already in the canvas transform. */
const STROKE = LINE_STROKE;
const ACTIVE_STROKE = 4;
const HALO = 2;
const BOULDER_DASH = [14, 10];
const SELECT_BLUE = Tokens.color.blue[500];
const SELECT_PAD = 8;

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
    return;
  }
  painted = true;
  dropLineGeometry(new Set(doc.layers.map((layer) => layer.id)));

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
  let active: LineLayer | null = null;
  for (const layer of doc.layers) {
    if (layer.id === doc.activeId) {
      active = layer;
      continue;
    }
    strokeLayer(ctx, layer, false);
  }
  if (active) {
    paintSelection(ctx, active);
    strokeLayer(ctx, active, true);
  }
  const hover = lineHoverStore.get();
  paintMarks(ctx, doc, hover, view.zoom);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintControls(
    ctx,
    active,
    hover,
    doc.anchorIndex,
    view.zoom,
    view.panX,
    view.panY,
  );
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
  ctx.lineWidth = (ACTIVE_STROKE + HALO) * layer.scale + SELECT_PAD;
  ctx.strokeStyle = SELECT_BLUE;
  ctx.stroke(path);
  ctx.restore();
}

function strokeLayer(
  ctx: CanvasRenderingContext2D,
  layer: LineLayer,
  active: boolean,
): void {
  if (layer.anchors.length < 2) return;
  const path = lineGeometry(
    layer.id,
    layer.geometryRevision,
    layer.anchors,
  ).path;
  const scale = layer.scale;
  const width = (active ? ACTIVE_STROKE : STROKE) * scale;
  ctx.setLineDash(
    layer.kind === "boulder"
      ? BOULDER_DASH.map((length) => length * scale)
      : [],
  );
  ctx.strokeStyle = Tokens.color.black[55];
  ctx.lineWidth = width + HALO * scale;
  ctx.stroke(path);
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = width;
  ctx.stroke(path);
  ctx.setLineDash([]);
}

function paintMarks(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  hover: LineHit | null,
  zoom: number,
): void {
  if (doc.points.length === 0 || !(zoom > 0)) return;
  const selectedId = markedId(doc, doc.activeId, doc.anchorIndex);
  const hoveredId =
    hover?.type === "anchor" ? markedId(doc, hover.layerId, hover.index) : null;
  ctx.setLineDash([]);
  for (const point of doc.points) {
    const radius = markRadius(doc.scale);
    if (!(radius > 0)) continue;
    ctx.save();
    ctx.translate(point.x, point.y);
    const selected = point.id === selectedId;
    if (selected || point.id === hoveredId) {
      const pad = Math.min(3 / zoom, radius * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, radius + pad, 0, Math.PI * 2);
      ctx.strokeStyle = SELECT_BLUE;
      ctx.lineWidth = Math.min((selected ? 2.5 : 1.5) / zoom, radius * 0.18);
      ctx.stroke();
    }
    drawPointMark(ctx, point.mark, radius, Math.min(1.5 / zoom, radius * 0.08));
    ctx.restore();
  }
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
  if (active && active.anchors.length > 0)
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
