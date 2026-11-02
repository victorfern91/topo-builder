import { Tokens } from "@ui";
import {
  findLayer,
  type LineHit,
  type LineLayer,
  type LineState,
} from "../../../state/lines.ts";
import { ANCHOR, fillSquare, square } from "./shared.ts";

export function paintControls(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  active: LineLayer | null,
  hover: LineHit | null,
  zoom: number,
  panX: number,
  panY: number,
): void {
  if (active && !active.locked && active.anchors.length > 0)
    paintAnchors(ctx, active, hover, doc.anchorIndex, zoom, panX, panY);
  if (!hover || hover.type !== "anchor" || hover.layerId === active?.id) return;
  const layer = findLayer(doc, hover.layerId);
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
