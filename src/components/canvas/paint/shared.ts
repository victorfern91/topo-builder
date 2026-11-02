import { Tokens } from "@ui";

export const ANCHOR = 5;
export const SELECT_BLUE = Tokens.color.blue[500];
export const SELECT_PAD = 8;
export const DROP_SPOT_FILL = Tokens.color.white[45];
export const SELECT_FILL = Tokens.color.blue[100];

export function fillSquare(
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

export function square(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const half = size / 2;
  ctx.rect(x - half, y - half, size, size);
}
