import { Tokens } from "@ui";
import {
  CORNER_SIGN,
  findLayer,
  markFrame,
  type LineHit,
  type LineState,
} from "../../../state/lines.ts";
import {
  drawPointMark,
  isFreeMark,
  markRadius,
  markSprite,
  standsAlone,
  type PointMark,
} from "../../../state/point-marks.ts";
import {
  ANCHOR,
  DROP_SPOT_FILL,
  fillSquare,
  SELECT_BLUE,
  SELECT_FILL,
} from "./shared.ts";

/**
 * `deviceScale` is device pixels per image pixel. With it, each mark is a cached
 * bitmap copied at whole device pixels and marks outside the buffer are skipped.
 * Without it (exports), every mark is drawn from its SVG.
 * `anchors` picks the anchors, which paint last so nothing covers them, or every other mark.
 */
export function paintMarks(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  selectedId: string | null,
  hoveredId: string | null,
  zoom: number,
  deviceScale: number | null,
  anchors: boolean,
): void {
  if (doc.points.length === 0 || !(zoom > 0)) return;
  const view = ctx.getTransform();
  ctx.setLineDash([]);
  for (const point of doc.points) {
    if (standsAlone(point.mark) !== anchors) continue;
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

export function markedId(
  doc: LineState,
  layerId: string | null,
  index: number | null,
): string | null {
  if (layerId === null || index === null) return null;
  return findLayer(doc, layerId)?.anchors[index]?.pointId ?? null;
}

/** Square frame with a handle on each corner around the selected characteristic. */
export function paintMarkFrame(
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

/**
 * Rings every route point a dragged route mark can land on, at the size it
 * lands at, and fills the ring at `landing`. Expects the device-pixel transform.
 */
export function paintDropSpots(
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
