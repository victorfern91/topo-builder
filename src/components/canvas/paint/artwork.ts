import type { GradeSystems } from "../../../state/grade.ts";
import type { LineState } from "../../../state/lines.ts";
import { paintArtworkBadges } from "./badges.ts";
import { paintCallouts } from "./callouts.ts";
import { paintMarks } from "./marks.ts";
import { strokeLayer } from "./routes.ts";

/**
 * Lines, marks, and numbers in image pixels, without selection or handles.
 * Marks and badges are sized as they look at a zoom of one over the draw scale.
 */
export function paintArtwork(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  system: GradeSystems,
): void {
  const ink = exportInk(doc);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const layer of doc.layers) strokeLayer(ctx, layer, false);
  paintMarks(ctx, doc, null, null, 1 / ink, null, false);
  ctx.setLineDash([]);
  paintArtworkBadges(ctx, doc, system, ink);
  paintCallouts(ctx, doc, null, 1, false);
  paintMarks(ctx, doc, null, null, 1 / ink, null, true);
  ctx.restore();
}

/** Image pixels per screen pixel for marks and badges in an export. */
export function exportInk(doc: LineState): number {
  return doc.scale > 0 && Number.isFinite(doc.scale) ? doc.scale : 1;
}
