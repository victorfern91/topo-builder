import { gradeLabel, type GradeSystems } from "./grade.ts";
import { curveSpan, frameAt, lineGeometry, projectSpan } from "./line-curve.ts";
import type { LineHit, LineLayer, LineState } from "./lines.ts";
import { gradeSystems, preferencesStore } from "./preferences.ts";
import { LINE_STROKE } from "./stroke.ts";

export type RouteNumber = {
  /** 0 at the start of the curve, 1 at the end. */
  t: number;
  /** Perpendicular offset in image pixels. Positive is left of travel. */
  side: number;
  /** Offset along the route past its start or end, in image pixels. Zero beside the route. */
  along: number;
};

/** Pills a line can hold beside it: its number text and its grade. */
export const ROUTE_BADGES = ["number", "grade"] as const;

export type RouteBadge = (typeof ROUTE_BADGES)[number];

export const DEFAULT_NUMBER_TEXT = "0";

export type BadgeType = {
  family: string;
  /** Pixels at zoom 1 and draw scale 1. The badge scales with the photo. */
  size: number;
  weight: number;
  height: number;
  /** Width beyond the text. */
  pad: number;
};

/** Loaded from Google Fonts in `index.html`. */
const BADGE_FAMILY = '"PT Sans", sans-serif';

/** Number matches an anchor; grade reads smaller beside the route. */
export const BADGE_TYPE = {
  number: {
    family: BADGE_FAMILY,
    size: 8,
    weight: 700,
    height: 12,
    pad: 4,
  },
  grade: {
    family: BADGE_FAMILY,
    size: 7,
    weight: 700,
    height: 11,
    pad: 4,
  },
} as const satisfies Record<RouteBadge, BadgeType>;

export function badgeFont(badge: RouteBadge): string {
  const type = BADGE_TYPE[badge];
  return `${type.weight} ${type.size}px ${type.family}`;
}

/**
 * Resolves once every badge font is ready. A canvas draws with the fallback
 * until then and does not repaint on its own.
 */
export function loadBadgeFonts(): Promise<unknown> {
  return Promise.all(
    ROUTE_BADGES.map((badge) => document.fonts.load(badgeFont(badge))),
  ).catch(() => undefined);
}

/**
 * Alphabetic-baseline origin, from the badge center, that centers the label's
 * ink with centered text alignment. The em box sits glyphs off center.
 */
export function badgeInk(
  label: string,
  badge: RouteBadge,
): { x: number; y: number } {
  const ctx = measureCtx();
  const size = BADGE_TYPE[badge].size;
  if (!ctx) return { x: 0, y: size * 0.36 };
  ctx.font = badgeFont(badge);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const ink = ctx.measureText(label);
  return {
    x: (ink.actualBoundingBoxLeft - ink.actualBoundingBoxRight) / 2,
    y: (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2,
  };
}

function measureCtx(): CanvasRenderingContext2D | null {
  if (badgeCtx === undefined) {
    badgeCtx = document.createElement("canvas").getContext("2d");
  }
  return badgeCtx;
}

const NUMBER_CLEAR = 20;
const NUMBER_BAND = 80;

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

/** Stored spots of the badge on the layer. A route repeats its number; it has one grade. */
export function badgeSpots(
  layer: LineLayer,
  badge: RouteBadge,
): readonly RouteNumber[] {
  if (badge === "number") return layer.routeNumbers;
  return layer.gradeBadge ? [layer.gradeBadge] : [];
}

export function badgeSpot(
  layer: LineLayer,
  badge: RouteBadge,
  index: number,
): RouteNumber | null {
  return badgeSpots(layer, badge)[index] ?? null;
}

/** Null means the badge is hidden. The stored offset stays put when the stroke scale changes. */
export function readRouteNumber(
  layer: LineLayer,
  badge: RouteBadge,
  index: number,
): RouteNumber | null {
  const spot = badgeSpot(layer, badge, index);
  if (layer.anchors.length < 2 || !spot) return null;
  const t = clamp01(spot.t);
  const along = Number.isFinite(spot.along) ? spot.along : 0;
  return {
    t,
    side: Number.isFinite(spot.side) ? spot.side : numberMagnet().clear,
    along: t <= 0 ? Math.min(0, along) : t >= 1 ? Math.max(0, along) : 0,
  };
}

/** True when the layer has what the badge shows. Only graded lines take a grade. */
export function canHoldBadge(layer: LineLayer, badge: RouteBadge): boolean {
  if (layer.anchors.length < 2) return false;
  return badge === "number" || layer.grade !== null;
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
  const magnet = numberMagnet();
  const along = (x - hit.x) * hit.tx + (y - hit.y) * hit.ty;
  const pastEnd = (hit.t <= 0 && along < 0) || (hit.t >= 1 && along > 0);
  if (!pastEnd) {
    return {
      t: hit.t,
      side: clampSide(hit.signed, magnet, preferSide),
      along: 0,
    };
  }
  return { t: hit.t, ...orbitEnd(hit.signed, along, magnet) };
}

/** Past a route end the badge circles the endpoint inside the magnet band. */
function orbitEnd(
  side: number,
  along: number,
  magnet: NumberMagnet,
): { side: number; along: number } {
  const distance = Math.hypot(side, along);
  if (!(distance > 0))
    return { side: 0, along: Math.sign(along) * magnet.clear };
  const radius = Math.min(magnet.reach, Math.max(magnet.clear, distance));
  return {
    side: (side / distance) * radius,
    along: (along / distance) * radius,
  };
}

export type NumberPlacement = {
  x: number;
  y: number;
  /** Point on the route the badge is glued to. */
  onX: number;
  onY: number;
};

export function routeNumberPlacement(
  layer: LineLayer,
  badge: RouteBadge,
  index: number,
): NumberPlacement | null {
  const placed = readRouteNumber(layer, badge, index);
  if (!placed) return null;
  const frame = frameAt(spanFor(layer), placed.t);
  if (!frame) return null;
  return {
    x: frame.x + frame.nx * placed.side + frame.tx * placed.along,
    y: frame.y + frame.ny * placed.side + frame.ty * placed.along,
    onX: frame.x,
    onY: frame.y,
  };
}

/** The line's number text, or its grade. Null when the line has no grade. */
export function badgeLabel(
  layer: LineLayer,
  badge: RouteBadge,
  systems: GradeSystems,
): string | null {
  if (badge === "grade") return gradeLabel(layer.kind, layer.grade, systems);
  return layer.numberText.trim() || DEFAULT_NUMBER_TEXT;
}

export function numberBadge(
  label: string,
  badge: RouteBadge,
): { width: number; height: number } {
  const type = BADGE_TYPE[badge];
  const ctx = measureCtx();
  if (!ctx) {
    return {
      width: Math.max(type.height, label.length * type.size * 0.62 + type.pad),
      height: type.height,
    };
  }
  ctx.font = badgeFont(badge);
  return {
    width: Math.max(
      type.height,
      Math.ceil(ctx.measureText(label).width + type.pad),
    ),
    height: type.height,
  };
}

/** `dx` and `dy` are badge pixels from the center: image pixels over the draw scale. */
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

export function sameRouteNumber(
  a: RouteNumber | null,
  b: RouteNumber | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.t === b.t && a.side === b.side && a.along === b.along;
}

/** Nearest unlocked number or grade badge under the pointer. */
export function nearestNumber(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): { hit: LineHit; dist: number } | null {
  if (!(zoom > 0)) return null;
  const system = gradeSystems(preferencesStore.get());
  let best: { hit: LineHit; dist: number } | null = null;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || layer.locked || !(layer.scale > 0)) continue;
    for (const kind of ROUTE_BADGES) {
      const label = badgeLabel(layer, kind, system);
      if (!label) continue;
      const badge = numberBadge(label, kind);
      const count = badgeSpots(layer, kind).length;
      for (let index = 0; index < count; index += 1) {
        const place = routeNumberPlacement(layer, kind, index);
        if (!place) continue;
        const dx = (x - place.x) / layer.scale;
        const dy = (y - place.y) / layer.scale;
        // Number badges include the white ring outside the fill.
        const edge = kind === "number" ? LINE_STROKE : 0;
        if (!insideNumberBadge(dx, dy, badge.width + edge, badge.height + edge))
          continue;
        const dist = distance2(place.x, place.y, x, y);
        if (!best || dist < best.dist) {
          best = {
            hit: { type: "number", layerId: layer.id, badge: kind, index },
            dist,
          };
        }
      }
    }
  }
  return best;
}

function distance2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
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
