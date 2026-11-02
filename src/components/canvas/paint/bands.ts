import { lineGeometry } from "../../../state/line-curve.ts";
import type { LineLayer, LineState } from "../../../state/lines.ts";
import { materialReach } from "../../../state/point-marks.ts";
import { numberMagnet } from "../../../state/route-number.ts";
import { SELECT_BLUE } from "./shared.ts";

export function paintNumberBand(
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
  ctx.lineCap = "round";
  ctx.lineWidth = numberMagnet().reach * 2;
  ctx.strokeStyle = layer.color;
  ctx.globalAlpha = 0.18;
  ctx.stroke(path);
  ctx.restore();
}

/** Shades the band beside every route where free material can land. */
export function paintMaterialBand(
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
