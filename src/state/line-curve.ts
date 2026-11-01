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

/** Drops cached paths so a restored revision cannot reuse a newer curve. */
export function clearLineGeometry(): void {
  cache.clear();
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

export type CurveSample = { x: number; y: number; d: number };

export type CurveSpan = {
  length: number;
  points: CurveSample[];
};

export type CurveFrame = {
  x: number;
  y: number;
  /** Unit tangent along the route. */
  tx: number;
  ty: number;
  /** Unit normal, left of travel. */
  nx: number;
  ny: number;
};

/** Polyline samples of the stroked curve, with distance from the start. */
export function curveSpan(ops: readonly CurveOp[]): CurveSpan {
  const points: CurveSample[] = [];
  let cx = 0;
  let cy = 0;
  let dist = 0;
  let open = false;
  for (const op of ops) {
    if (op.op === "M") {
      cx = op.x;
      cy = op.y;
      if (points.length === 0) points.push({ x: cx, y: cy, d: 0 });
      open = true;
      continue;
    }
    if (!open) continue;
    if (op.op === "L") {
      dist += Math.hypot(op.x - cx, op.y - cy);
      points.push({ x: op.x, y: op.y, d: dist });
      cx = op.x;
      cy = op.y;
      continue;
    }
    for (let step = 1; step <= SAMPLES; step += 1) {
      const u = step / SAMPLES;
      const x = cubic(cx, op.c1x, op.c2x, op.x, u);
      const y = cubic(cy, op.c1y, op.c2y, op.y, u);
      const prev = points[points.length - 1];
      if (!prev) continue;
      dist += Math.hypot(x - prev.x, y - prev.y);
      points.push({ x, y, d: dist });
    }
    cx = op.x;
    cy = op.y;
  }
  return { length: dist, points };
}

/** Pose at `t` (0 at the start, 1 at the end). */
export function frameAt(span: CurveSpan, t: number): CurveFrame | null {
  const { points, length } = span;
  if (points.length < 2 || !(length > 0) || !Number.isFinite(t)) return null;
  const target = Math.min(1, Math.max(0, t)) * length;
  let index = 1;
  while (index < points.length - 1 && (points[index]?.d ?? 0) < target) {
    index += 1;
  }
  const start = points[index - 1];
  const end = points[index];
  if (!start || !end) return null;
  const spanD = end.d - start.d;
  const u = spanD > 0 ? (target - start.d) / spanD : 0;
  return frameFrom(
    start.x + (end.x - start.x) * u,
    start.y + (end.y - start.y) * u,
    end.x - start.x,
    end.y - start.y,
  );
}

/** Closest pose on the curve. `signed` is the perpendicular distance, positive to the left. */
export function projectSpan(
  span: CurveSpan,
  x: number,
  y: number,
): (CurveFrame & { t: number; signed: number }) | null {
  const { points, length } = span;
  if (points.length < 2 || !(length > 0)) return null;
  let best = Number.POSITIVE_INFINITY;
  let bestX = 0;
  let bestY = 0;
  let bestD = 0;
  let bestTx = 1;
  let bestTy = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (!start || !end) continue;
    const hit = closestOnSegment(x, y, start.x, start.y, end.x, end.y);
    if (hit.dist >= best) continue;
    best = hit.dist;
    bestX = hit.x;
    bestY = hit.y;
    const abx = end.x - start.x;
    const aby = end.y - start.y;
    const denom = abx * abx + aby * aby;
    let u = 0;
    if (denom > 0) {
      u = ((hit.x - start.x) * abx + (hit.y - start.y) * aby) / denom;
      if (u < 0) u = 0;
      else if (u > 1) u = 1;
    }
    bestD = start.d + (end.d - start.d) * u;
    bestTx = abx;
    bestTy = aby;
  }
  if (!(best < Number.POSITIVE_INFINITY)) return null;
  const frame = frameFrom(bestX, bestY, bestTx, bestTy);
  const signed = (x - bestX) * frame.nx + (y - bestY) * frame.ny;
  return { ...frame, t: bestD / length, signed };
}

function frameFrom(x: number, y: number, tx: number, ty: number): CurveFrame {
  const len = Math.hypot(tx, ty);
  const ux = len > 0 ? tx / len : 1;
  const uy = len > 0 ? ty / len : 0;
  return { x, y, tx: ux, ty: uy, nx: -uy, ny: ux };
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
