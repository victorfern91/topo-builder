import { Tokens } from "@ui";
import {
  CALLOUT_LEADING,
  calloutFont,
  calloutFontSize,
  calloutLayout,
} from "../../../state/callouts.ts";
import {
  framePad,
  type ExitArrow,
  type LineHit,
  type LineState,
  type TextEdge,
} from "../../../state/lines.ts";
import { placementAt } from "../../../state/route-number.ts";
import { ARROW_STROKE, LINE_HALO } from "../../../state/stroke.ts";
import { lineStroke } from "./routes.ts";
import { ANCHOR, SELECT_BLUE } from "./shared.ts";

const HALO = Tokens.color.neutral[950];
/** Barb length at scale 1, in image pixels. Long enough to read as a pen flick. */
const HEAD = 13;
/** How far each barb opens, as a fraction of its length. A narrow V, like ink. */
const WING = 0.42;

export type ArrowFigure = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tipX: number;
  tipY: number;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
};

/** Shaft runs to the tip. The barbs are a narrow V drawn with the same pen. */
export function arrowFigure(
  exit: ExitArrow,
  scale: number,
): ArrowFigure | null {
  const dx = exit.tipX - exit.x;
  const dy = exit.tipY - exit.y;
  const len = Math.hypot(dx, dy);
  if (!(len > 0) || !(scale > 0)) return null;
  const head = Math.min(HEAD * scale, len * 0.45);
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const wing = head * WING;
  const baseX = exit.tipX - ux * head;
  const baseY = exit.tipY - uy * head;
  return {
    x1: exit.x,
    y1: exit.y,
    x2: exit.tipX,
    y2: exit.tipY,
    tipX: exit.tipX,
    tipY: exit.tipY,
    leftX: baseX + px * wing,
    leftY: baseY + py * wing,
    rightX: baseX - px * wing,
    rightY: baseY - py * wing,
  };
}

/**
 * Notes, free text, and exit arrows in image space.
 * `chrome` draws the selection, the aim handles, and the link back to the route.
 */
export function paintCallouts(
  ctx: CanvasRenderingContext2D,
  doc: LineState,
  hover: LineHit | null,
  zoom: number,
  chrome: boolean,
): void {
  if (!(zoom > 0)) return;
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const exit of doc.exits) {
    paintExit(ctx, exit, doc.scale, exit.id === doc.calloutId, zoom, chrome);
  }
  const labelScale = doc.scale > 0 ? doc.scale : 0;
  if (labelScale > 0) {
    for (const label of doc.labels) {
      paintText(ctx, {
        text: label.text,
        x: label.x,
        y: label.y,
        scale: labelScale,
        width: label.width,
        color: label.color,
        kind: "label",
        locked: label.locked,
        selected: chrome && label.id === doc.calloutId,
        hovered:
          chrome &&
          ((hover?.type === "label" && hover.labelId === label.id) ||
            (hover?.type === "labelEdge" && hover.labelId === label.id)),
        edge:
          chrome && hover?.type === "labelEdge" && hover.labelId === label.id
            ? hover.edge
            : null,
        zoom,
      });
    }
  }
  for (const layer of doc.layers) {
    if (!(layer.scale > 0)) continue;
    const color = lineStroke(layer).color;
    for (const note of layer.notes) {
      const place = placementAt(layer, note.place);
      if (!place) continue;
      const selected = chrome && note.id === doc.calloutId;
      const hovered =
        chrome &&
        ((hover?.type === "note" && hover.noteId === note.id) ||
          (hover?.type === "noteEdge" && hover.noteId === note.id));
      const edge =
        chrome && hover?.type === "noteEdge" && hover.noteId === note.id
          ? hover.edge
          : null;
      if (selected || hovered) {
        ctx.beginPath();
        ctx.moveTo(place.onX, place.onY);
        ctx.lineTo(place.x, place.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = layer.locked ? 0.55 : 0.8;
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      paintText(ctx, {
        text: note.text,
        x: place.x,
        y: place.y,
        scale: layer.scale,
        width: note.width,
        color,
        kind: "note",
        locked: layer.locked,
        selected,
        hovered,
        edge,
        zoom,
      });
    }
  }
  ctx.restore();
}

function paintExit(
  ctx: CanvasRenderingContext2D,
  exit: ExitArrow,
  scale: number,
  selected: boolean,
  zoom: number,
  chrome: boolean,
): void {
  const figure = arrowFigure(exit, scale > 0 ? scale : 1);
  if (!figure) return;
  const drawn = scale > 0 ? scale : 1;
  const width = ARROW_STROKE * drawn;
  ctx.save();
  if (exit.locked) ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(figure.x1, figure.y1);
  ctx.lineTo(figure.tipX, figure.tipY);
  ctx.moveTo(figure.leftX, figure.leftY);
  ctx.lineTo(figure.tipX, figure.tipY);
  ctx.lineTo(figure.rightX, figure.rightY);
  ctx.lineWidth = width + LINE_HALO * drawn * 0.5;
  ctx.strokeStyle = Tokens.color.black[55];
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = exit.color;
  ctx.stroke();
  if (chrome && selected && !exit.locked) {
    ctx.globalAlpha = 1;
    paintHandle(ctx, exit.x, exit.y, zoom);
    paintHandle(ctx, exit.tipX, exit.tipY, zoom);
  }
  ctx.restore();
}

function paintHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, 4 / zoom, 0, Math.PI * 2);
  ctx.fillStyle = Tokens.color.neutral[0];
  ctx.strokeStyle = SELECT_BLUE;
  ctx.lineWidth = 1.5 / zoom;
  ctx.fill();
  ctx.stroke();
}

function paintText(
  ctx: CanvasRenderingContext2D,
  text: {
    text: string;
    x: number;
    y: number;
    scale: number;
    width: number | null;
    color: string;
    kind: "note" | "label";
    locked: boolean;
    selected: boolean;
    hovered: boolean;
    edge: TextEdge | null;
    zoom: number;
  },
): void {
  const box = calloutLayout(text.text, text.kind, text.width);
  ctx.save();
  ctx.translate(text.x, text.y);
  if (text.locked) ctx.globalAlpha = 0.55;
  if (text.selected || text.hovered) {
    const resizing = text.selected && !text.locked;
    const pad = resizing ? framePad(text.zoom) : 0;
    const width = box.width * text.scale + pad * 2;
    const height = box.height * text.scale + pad * 2;
    ctx.strokeStyle = SELECT_BLUE;
    ctx.lineWidth = 1.5 / text.zoom;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    if (resizing) {
      for (const edge of ["w", "e"] as const) {
        const held = text.edge === edge;
        paintCorner(
          ctx,
          (edge === "e" ? 1 : -1) * (width / 2),
          0,
          (held ? ANCHOR + 2 : ANCHOR) / text.zoom,
          text.zoom,
          held,
        );
      }
    }
  }
  const shown = text.text.trim();
  if (shown) {
    ctx.scale(text.scale, text.scale);
    ctx.font = calloutFont(text.kind);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = HALO;
    ctx.fillStyle = text.color;
    const leading = calloutFontSize(text.kind) * CALLOUT_LEADING;
    const start = -((box.lines.length - 1) * leading) / 2;
    for (let index = 0; index < box.lines.length; index += 1) {
      const line = box.lines[index] ?? "";
      if (!line) continue;
      const y = start + index * leading;
      ctx.strokeText(line, 0, y);
      ctx.fillText(line, 0, y);
    }
  }
  ctx.restore();
}

function paintCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  zoom: number,
  held: boolean,
): void {
  const half = size / 2;
  ctx.beginPath();
  ctx.rect(x - half, y - half, size, size);
  ctx.fillStyle = held ? SELECT_BLUE : Tokens.color.neutral[0];
  ctx.strokeStyle = SELECT_BLUE;
  ctx.lineWidth = 1.5 / zoom;
  ctx.fill();
  ctx.stroke();
}
