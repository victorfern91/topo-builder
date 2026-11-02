import { Tokens } from "@ui";
import { svgNumber as n } from "./svg.ts";

export const POINT_MARKS = ["bolt", "ring", "belay", "rappel"] as const;

export type PointMark = (typeof POINT_MARKS)[number];

/** Image-pixel disc radius at draw scale 1. Ticks sit just outside it. */
export const MARK_RADIUS = 12;

const TICKS = 6;

export function markRadius(scale: number): number {
  return MARK_RADIUS * Math.max(scale, 0);
}

/** How far a plain anchor snaps onto a mark, in image pixels. */
export function magnetReach(zoom: number, scale: number): number {
  const visual = markRadius(scale) * 0.85;
  if (!(zoom > 0)) return visual;
  return Math.max(16 / zoom, visual);
}

/** White hardware symbol. Holes and the arrow are black, matching the reference art. */
export function drawPointMark(
  ctx: CanvasRenderingContext2D,
  mark: PointMark,
  radius: number,
  hairline: number,
): void {
  if (!(radius > 0)) return;
  fillDisc(ctx, radius, hairline, mark === "bolt" || mark === "ring");
  if (mark === "ring") fillHole(ctx, 0, 0, radius * 0.36);
  else if (mark === "belay") {
    const hole = radius * 0.32;
    const offset = radius * 0.5;
    fillHole(ctx, -offset, 0, hole);
    fillHole(ctx, offset, 0, hole);
  } else if (mark === "rappel") drawArrow(ctx, radius);
}

/** Same symbol as `drawPointMark`, as SVG elements centered on the origin. */
export function pointMarkSvg(
  mark: PointMark,
  radius: number,
  hairline: number,
): string {
  if (!(radius > 0)) return "";
  const ink = Tokens.color.neutral[950];
  let d = `M${n(radius)} 0A${n(radius)} ${n(radius)} 0 1 1 ${n(-radius)} 0A${n(radius)} ${n(radius)} 0 1 1 ${n(radius)} 0Z`;
  if (mark === "bolt" || mark === "ring") d += tickPath(radius);
  let svg = `<path d="${d}" fill="${Tokens.color.neutral[0]}" stroke="${ink}" stroke-width="${n(hairline)}" stroke-linejoin="round"/>`;
  const hole = (x: number, r: number) =>
    `<circle cx="${n(x)}" cy="0" r="${n(r)}" fill="${ink}"/>`;
  if (mark === "ring") svg += hole(0, radius * 0.36);
  else if (mark === "belay") {
    svg += hole(-radius * 0.5, radius * 0.32);
    svg += hole(radius * 0.5, radius * 0.32);
  } else if (mark === "rappel") {
    const arrow = [
      `M0 ${n(-radius * 0.55)}L0 ${n(radius * 0.28)}`,
      `M${n(-radius * 0.42)} ${n(radius * 0.05)}L0 ${n(radius * 0.58)}L${n(radius * 0.42)} ${n(radius * 0.05)}`,
    ].join("");
    svg += `<path d="${arrow}" fill="none" stroke="${ink}" stroke-width="${n(radius * 0.14)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return svg;
}

function tickPath(radius: number): string {
  const width = radius * 0.16;
  const length = radius * 0.2;
  const inner = radius - length * 0.35;
  const corners = [
    [-width / 2, -inner - length],
    [width / 2, -inner - length],
    [width / 2, -inner],
    [-width / 2, -inner],
  ] as const;
  let d = "";
  for (let index = 0; index < TICKS; index += 1) {
    const angle = Math.PI / 4 + index * (Math.PI / 3);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    d += corners
      .map(
        ([x, y], corner) =>
          `${corner === 0 ? "M" : "L"}${n(x * cos - y * sin)} ${n(x * sin + y * cos)}`,
      )
      .join("");
    d += "Z";
  }
  return d;
}

function fillDisc(
  ctx: CanvasRenderingContext2D,
  radius: number,
  hairline: number,
  ticks: boolean,
): void {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  if (ticks) addTicks(ctx, radius);
  ctx.fillStyle = Tokens.color.neutral[0];
  ctx.fill();
  ctx.lineWidth = hairline;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.strokeStyle = Tokens.color.neutral[950];
  ctx.stroke();
}

function addTicks(ctx: CanvasRenderingContext2D, radius: number): void {
  const width = radius * 0.16;
  const length = radius * 0.2;
  const inner = radius - length * 0.35;
  for (let index = 0; index < TICKS; index += 1) {
    const angle = Math.PI / 4 + index * (Math.PI / 3);
    ctx.save();
    ctx.rotate(angle);
    ctx.rect(-width / 2, -inner - length, width, length);
    ctx.restore();
  }
}

function fillHole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = Tokens.color.neutral[950];
  ctx.fill();
}

function drawArrow(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.strokeStyle = Tokens.color.neutral[950];
  ctx.lineWidth = radius * 0.14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.55);
  ctx.lineTo(0, radius * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, radius * 0.05);
  ctx.lineTo(0, radius * 0.58);
  ctx.lineTo(radius * 0.42, radius * 0.05);
  ctx.stroke();
}
