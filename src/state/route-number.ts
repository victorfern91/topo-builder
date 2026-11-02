import { gradeLabel, type GradeSystem } from "./grade.ts";
import { curveSpan, frameAt, lineGeometry, projectSpan } from "./line-curve.ts";
import type { LineLayer } from "./lines.ts";

export type RouteNumber = {
  /** 0 at the start of the curve, 1 at the end. */
  t: number;
  /** Perpendicular offset in image pixels. Positive is left of travel. */
  side: number;
};

export const NUMBER_FONT_WEIGHT = 650;
export const NUMBER_FONT_SIZE = 11;
export const NUMBER_FONT_FAMILY =
  '"Segoe UI", "Helvetica Neue", system-ui, sans-serif';

/** Screen badge. Zoom does not change its size, so the digit stays readable. */
export const NUMBER_FONT = `${NUMBER_FONT_WEIGHT} ${NUMBER_FONT_SIZE}px ${NUMBER_FONT_FAMILY}`;

const NUMBER_CLEAR = 16;
const NUMBER_BAND = 40;
const NUMBER_HEIGHT = 16;

const spans = new Map<
  string,
  { revision: number; span: ReturnType<typeof curveSpan> }
>();

export function dropRouteSpans(live: ReadonlySet<string>): void {
  for (const id of spans.keys()) {
    if (!live.has(id)) spans.delete(id);
  }
}

let badgeCtx: CanvasRenderingContext2D | null | undefined;

export type NumberMagnet = { clear: number; reach: number };

/** Band beside the route, in image pixels. Stroke scale does not move it. */
export function numberMagnet(): NumberMagnet {
  return { clear: NUMBER_CLEAR, reach: NUMBER_CLEAR + NUMBER_BAND };
}

export function defaultRouteNumber(): RouteNumber {
  return { t: 0, side: numberMagnet().clear };
}

/** Null means the badge is hidden. The stored offset stays put when the stroke scale changes. */
export function readRouteNumber(layer: LineLayer): RouteNumber | null {
  if (layer.anchors.length < 2 || !layer.routeNumber) return null;
  const side = layer.routeNumber.side;
  return {
    t: clamp01(layer.routeNumber.t),
    side: Number.isFinite(side) ? side : numberMagnet().clear,
  };
}

export function numberFromPointer(
  layer: LineLayer,
  x: number,
  y: number,
  preferSide: number,
): RouteNumber | null {
  if (layer.anchors.length < 2) return null;
  const hit = projectSpan(spanFor(layer), x, y);
  if (!hit) return null;
  return {
    t: hit.t,
    side: clampSide(hit.signed, numberMagnet(), preferSide),
  };
}

export type NumberPlacement = {
  x: number;
  y: number;
  /** Point on the route the badge is glued to. */
  onX: number;
  onY: number;
};

export function routeNumberPlacement(layer: LineLayer): NumberPlacement | null {
  const placed = readRouteNumber(layer);
  if (!placed) return null;
  const frame = frameAt(spanFor(layer), placed.t);
  if (!frame) return null;
  return {
    x: frame.x + frame.nx * placed.side,
    y: frame.y + frame.ny * placed.side,
    onX: frame.x,
    onY: frame.y,
  };
}

/** List number, plus the grade when the route has one. */
export function numberLabel(
  order: number,
  grade: number | null | undefined,
  system: GradeSystem,
): string {
  const name = gradeLabel(grade, system);
  const text = String(order);
  return name ? `${text} ${name}` : text;
}

export function numberBadge(label: string): { width: number; height: number } {
  if (badgeCtx === undefined) {
    badgeCtx = document.createElement("canvas").getContext("2d");
  }
  if (!badgeCtx) {
    return { width: Math.max(16, label.length * 8 + 8), height: NUMBER_HEIGHT };
  }
  badgeCtx.font = NUMBER_FONT;
  return {
    width: Math.max(16, Math.ceil(badgeCtx.measureText(label).width + 8)),
    height: NUMBER_HEIGHT,
  };
}

/** `dx` and `dy` are screen pixels from the badge center. */
export function insideNumberBadge(
  dx: number,
  dy: number,
  width: number,
  height: number,
): boolean {
  const hy = height / 2;
  if (Math.abs(dy) > hy) return false;
  const inner = Math.max(0, width / 2 - hy);
  if (Math.abs(dx) <= inner) return true;
  const ex = Math.abs(dx) - inner;
  return ex * ex + dy * dy <= hy * hy;
}

export function clearRouteNumberCache(): void {
  spans.clear();
}

function spanFor(layer: LineLayer): ReturnType<typeof curveSpan> {
  const cached = spans.get(layer.id);
  if (cached && cached.revision === layer.geometryRevision) return cached.span;
  const span = curveSpan(
    lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops,
  );
  spans.set(layer.id, { revision: layer.geometryRevision, span });
  return span;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampSide(
  signed: number,
  magnet: NumberMagnet,
  prefer: number,
): number {
  const finite = Number.isFinite(signed) ? signed : prefer;
  const sign =
    Math.abs(finite) < magnet.clear
      ? prefer < 0
        ? -1
        : 1
      : finite < 0
        ? -1
        : 1;
  const magnitude = Math.min(
    magnet.reach,
    Math.max(magnet.clear, Math.abs(finite)),
  );
  return sign * (Number.isFinite(magnitude) ? magnitude : magnet.clear);
}
