import { Tokens } from "@ui";
import type { GradeSystem } from "../../../state/grade.ts";
import type { LineHit, LineLayer, LineState } from "../../../state/lines.ts";
import { preferencesStore } from "../../../state/preferences.ts";
import { numberDragStore } from "../../../state/route-badge.ts";
import {
  badgeFont,
  badgeInk,
  badgeLabel,
  badgeSpots,
  numberBadge,
  ROUTE_BADGES,
  routeNumberPlacement,
  type RouteBadge,
} from "../../../state/route-number.ts";
import { LINE_STROKE } from "../../../state/stroke.ts";

const SELECT_BLUE = Tokens.color.blue[500];

export const BADGE_FILL = Tokens.color.neutral[950];
export const BADGE_TEXT = Tokens.color.neutral[0];
export const BADGE_EDGE_COLOR = Tokens.color.neutral[0];
/** As wide as the route stroke. */
export const BADGE_EDGE = LINE_STROKE / 4;

export function paintLineNumbers(
  ctx: CanvasRenderingContext2D,
  layers: readonly LineLayer[],
  hover: LineHit | null,
  zoom: number,
  panX: number,
  panY: number,
): void {
  if (!(zoom > 0)) return;
  const dragged = numberDragStore.get();
  const system = preferencesStore.get().gradeSystem;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const layer of layers) {
    for (const kind of ROUTE_BADGES) {
      const label = badgeLabel(layer, kind, system);
      if (!label) continue;
      const count = badgeSpots(layer, kind).length;
      for (let index = 0; index < count; index += 1) {
        const place = routeNumberPlacement(layer, kind, index);
        if (!place) continue;
        const x = panX + place.x * zoom;
        const y = panY + place.y * zoom;
        const grabbed =
          dragged?.layerId === layer.id &&
          dragged.badge === kind &&
          dragged.index === index;
        const held =
          grabbed ||
          (hover?.type === "number" &&
            hover.layerId === layer.id &&
            hover.badge === kind &&
            hover.index === index);
        ctx.save();
        if (layer.locked) ctx.globalAlpha = 0.55;
        if (grabbed) {
          ctx.beginPath();
          ctx.moveTo(panX + place.onX * zoom, panY + place.onY * zoom);
          ctx.lineTo(x, y);
          ctx.lineWidth = 1;
          ctx.strokeStyle = layer.color;
          ctx.stroke();
        }
        ctx.translate(x, y);
        ctx.scale(zoom * layer.scale, zoom * layer.scale);
        fillBadge(ctx, label, kind, held ? SELECT_BLUE : BADGE_EDGE_COLOR);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

/** Pill centered on the origin. Expects centered text alignment. */
function fillBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  kind: RouteBadge,
  edge: string,
): void {
  const badge = numberBadge(label, kind);
  const x = -badge.width / 2;
  const y = -badge.height / 2;
  ctx.beginPath();
  ctx.roundRect(x, y, badge.width, badge.height, badge.height / 2);
  ctx.fillStyle = BADGE_FILL;
  ctx.fill();
  if (kind === "number") {
    // Canvas strokes sit on the path. Shift out by half the edge so the whole
    // white ring matches the route stroke width instead of half of it.
    const rim = BADGE_EDGE / 2;
    ctx.beginPath();
    ctx.roundRect(
      x - rim,
      y - rim,
      badge.width + BADGE_EDGE,
      badge.height + BADGE_EDGE,
      badge.height / 2 + rim,
    );
    ctx.lineWidth = BADGE_EDGE;
    ctx.strokeStyle = edge;
    ctx.stroke();
  }
  ctx.font = badgeFont(kind);
  ctx.fillStyle = BADGE_TEXT;
  ctx.textBaseline = "alphabetic";
  const ink = badgeInk(label, kind);
  ctx.fillText(label, ink.x, ink.y);
}

export function paintArtworkBadges(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  system: GradeSystem,
  ink: number,
): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const layer of doc.layers) {
    for (const kind of ROUTE_BADGES) {
      const label = badgeLabel(layer, kind, system);
      if (!label) continue;
      const count = badgeSpots(layer, kind).length;
      for (let index = 0; index < count; index += 1) {
        const place = routeNumberPlacement(layer, kind, index);
        if (!place) continue;
        ctx.save();
        ctx.translate(place.x, place.y);
        ctx.scale(ink, ink);
        fillBadge(ctx, label, kind, BADGE_EDGE_COLOR);
        ctx.restore();
      }
    }
  }
}
