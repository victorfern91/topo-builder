import { curveCatmullRom, line } from "d3-shape";

export type CurvePoint = { x: number; y: number };

export type CurveOp =
  | { op: "M"; x: number; y: number }
  | { op: "L"; x: number; y: number }
  | {
      op: "C";
      c1x: number;
      c1y: number;
      c2x: number;
      c2y: number;
      x: number;
      y: number;
    };

type Geometry = { revision: number; path: Path2D; ops: CurveOp[] };

const SAMPLES = 16;

const cache = new Map<string, Geometry>();

const trace = line<CurvePoint>()
  .x((point) => point.x)
  .y((point) => point.y)
  .curve(curveCatmullRom);

/** Centripetal Catmull–Rom through the anchors, cached as a canvas path. */
export function lineGeometry(
  id: string,
  revision: number,
  anchors: readonly CurvePoint[],
): Geometry {
  const cached = cache.get(id);
  if (cached && cached.revision === revision) return cached;
  const ops: CurveOp[] = [];
  const sink: Pick<
    CanvasPath,
    "moveTo" | "lineTo" | "bezierCurveTo" | "closePath"
  > = {
    moveTo(x, y) {
      ops.push({ op: "M", x, y });
    },
    lineTo(x, y) {
      ops.push({ op: "L", x, y });
    },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      ops.push({ op: "C", c1x, c1y, c2x, c2y, x, y });
    },
    closePath() {},
  };
  trace.context(sink as CanvasRenderingContext2D);
  trace(anchors);
  trace.context(null);
  const path = new Path2D();
  for (const op of ops) {
    if (op.op === "M") path.moveTo(op.x, op.y);
    else if (op.op === "L") path.lineTo(op.x, op.y);
    else path.bezierCurveTo(op.c1x, op.c1y, op.c2x, op.c2y, op.x, op.y);
  }
  const next = { revision, path, ops };
  cache.set(id, next);
  return next;
}

export function dropLineGeometry(live: ReadonlySet<string>): void {
  for (const id of cache.keys()) {
    if (!live.has(id)) cache.delete(id);
  }
}

/** Nearest point on the stroked curve. `index` is where a new anchor should be inserted. */
export function closestOnLine(
  ops: readonly CurveOp[],
  x: number,
  y: number,
): { index: number; x: number; y: number } | null {
  let best = Number.POSITIVE_INFINITY;
  let bestX = 0;
  let bestY = 0;
  let bestIndex = 0;
  let ax = 0;
  let ay = 0;
  let open = false;
  let segment = 0;
  for (const op of ops) {
    if (op.op === "M") {
      ax = op.x;
      ay = op.y;
      open = true;
      continue;
    }
    if (!open) continue;
    segment += 1;
    const hit =
      op.op === "L"
        ? closestOnSegment(x, y, ax, ay, op.x, op.y)
        : closestOnBezier(ax, ay, op, x, y);
    if (hit.dist < best) {
      best = hit.dist;
      bestX = hit.x;
      bestY = hit.y;
      bestIndex = segment;
    }
    ax = op.x;
    ay = op.y;
  }
  if (bestIndex === 0) return null;
  return { index: bestIndex, x: bestX, y: bestY };
}

export function curveDistance2(
  ops: readonly CurveOp[],
  x: number,
  y: number,
): number {
  let best = Number.POSITIVE_INFINITY;
  let ax = 0;
  let ay = 0;
  let open = false;
  for (const op of ops) {
    if (op.op === "M") {
      ax = op.x;
      ay = op.y;
      open = true;
      continue;
    }
    if (!open) continue;
    const dist =
      op.op === "L"
        ? segmentDistance2(x, y, ax, ay, op.x, op.y)
        : bezierDistance2(ax, ay, op, x, y);
    if (dist < best) best = dist;
    ax = op.x;
    ay = op.y;
  }
  return best;
}

function bezierDistance2(
  x0: number,
  y0: number,
  op: Extract<CurveOp, { op: "C" }>,
  x: number,
  y: number,
): number {
  return closestOnBezier(x0, y0, op, x, y).dist;
}

function closestOnBezier(
  x0: number,
  y0: number,
  op: Extract<CurveOp, { op: "C" }>,
  x: number,
  y: number,
): { dist: number; x: number; y: number } {
  let best = { dist: Number.POSITIVE_INFINITY, x: x0, y: y0 };
  let ax = x0;
  let ay = y0;
  for (let step = 1; step <= SAMPLES; step += 1) {
    const t = step / SAMPLES;
    const bx = cubic(x0, op.c1x, op.c2x, op.x, t);
    const by = cubic(y0, op.c1y, op.c2y, op.y, t);
    const hit = closestOnSegment(x, y, ax, ay, bx, by);
    if (hit.dist < best.dist) best = hit;
    ax = bx;
    ay = by;
  }
  return best;
}

function cubic(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return uu * u * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + tt * t * p3;
}

function segmentDistance2(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return closestOnSegment(px, py, ax, ay, bx, by).dist;
}

function closestOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { dist: number; x: number; y: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const denom = abx * abx + aby * aby;
  if (denom === 0) return { dist: distance2(ax, ay, px, py), x: ax, y: ay };
  let t = ((px - ax) * abx + (py - ay) * aby) / denom;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const x = ax + abx * t;
  const y = ay + aby * t;
  return { dist: distance2(x, y, px, py), x, y };
}

function distance2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
