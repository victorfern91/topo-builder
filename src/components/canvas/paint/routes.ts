import { Tokens } from "@ui";
import { gradePaint } from "../../../state/grade.ts";
import { lineGeometry } from "../../../state/line-curve.ts";
import type { LineLayer } from "../../../state/lines.ts";
import { LINE_HALO, LINE_STROKE } from "../../../state/stroke.ts";
import { SELECT_BLUE, SELECT_PAD } from "./shared.ts";

const STROKE = LINE_STROKE;
const HALO = LINE_HALO;
const BOULDER_DASH = [14, 10];

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
  const graded = gradePaint(layer.kind, layer.grade);
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

export function strokeLayer(
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

export function paintSelection(
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
  ctx.lineWidth = (STROKE + HALO) * layer.scale + SELECT_PAD;
  ctx.strokeStyle = SELECT_BLUE;
  ctx.stroke(path);
  ctx.restore();
}

/** Active selection halo then every route stroke. Expects image space. */
export function paintRouteStrokes(
  ctx: CanvasRenderingContext2D,
  layers: readonly LineLayer[],
  activeId: string | null,
): LineLayer | null {
  let active: LineLayer | null = null;
  for (const layer of layers) {
    if (layer.id === activeId) {
      active = layer;
      paintSelection(ctx, layer);
    }
    strokeLayer(ctx, layer, true);
  }
  return active;
}
