import { Store } from "@tanstack/store";
import type { MessageId } from "../i18n/messages.ts";
import circleSource from "../assets/point-marks/circle.svg?raw";
import crossSource from "../assets/point-marks/cross.svg?raw";
import lowerSource from "../assets/point-marks/lower.svg?raw";
import stackSource from "../assets/point-marks/stack.svg?raw";
import warningSource from "../assets/point-marks/warning.svg?raw";
import { LINE_HALO } from "./stroke.ts";

export const POINT_MARKS = [
  "lower",
  "circle",
  "stack",
  "warning",
  "cross",
] as const;

export type PointMark = (typeof POINT_MARKS)[number];

export const MARK_LABEL = {
  cross: "crossMark",
  stack: "stackMark",
  lower: "lowerMark",
  circle: "circleMark",
  warning: "warningMark",
} as const satisfies Record<PointMark, MessageId>;

/**
 * Anchors sit on route points. Characteristics sit anywhere on the photo.
 * Material sits on route points, on the line, which gains a point there, or
 * free inside a band beside a route.
 */
export type MarkKind = "anchor" | "characteristic" | "material";

export const MARK_KINDS = ["anchor", "material", "characteristic"] as const;

export const MARK_KIND = {
  lower: "anchor",
  circle: "anchor",
  stack: "characteristic",
  warning: "characteristic",
  cross: "material",
} as const satisfies Record<PointMark, MarkKind>;

export const MARK_KIND_LABEL = {
  anchor: "anchorMarks",
  characteristic: "characteristicMarks",
  material: "materialMarks",
} as const satisfies Record<MarkKind, MessageId>;

/** Half the side of a mark, in image pixels at draw scale 1. */
export const MARK_RADIUS = 7;

/** Material draws at this fraction of `MARK_RADIUS`. */
const MATERIAL_SIZE = 0.6;

/** Free material stays within this many `MARK_RADIUS` of a route. */
const MATERIAL_BAND = 3;

/** True for marks that sit anywhere on the photo instead of on a route. */
export function isFreeMark(mark: PointMark): boolean {
  return MARK_KIND[mark] === "characteristic";
}

/** True for marks that may stand on the photo without a route point. */
export function canStandFree(mark: PointMark): boolean {
  return MARK_KIND[mark] !== "anchor";
}

/** How far from a route free material may sit, in image pixels. */
export function materialReach(scale: number): number {
  return MARK_RADIUS * MATERIAL_BAND * Math.max(scale, 0);
}

/**
 * One SVG per mark. Each holds the mark as its one top-level group, and its
 * `viewBox` is that group's visual bounds with the stroke included.
 */
const ART_SOURCES = {
  cross: crossSource,
  stack: stackSource,
  lower: lowerSource,
  circle: circleSource,
  warning: warningSource,
} as const satisfies Record<PointMark, string>;

/** Strokes that thicken a solid glyph rather than outline a shape. */
const SOLID_STROKES = new Set(["circle139", "path140"]);

const STROKE_WIDTH = /stroke-width:\s*([\d.]+)/;
/** The fill covers the inner half of these strokes. */
const PAINT_STROKE_FIRST = /paint-order:\s*stroke/;

type MarkArt = {
  /** The group with line-width outlines. */
  markup: string;
  /** Maps `markup` onto a square of radius one centered on the origin. */
  unit: string;
  /** Standalone SVG document of the mark with its source strokes, for widgets. */
  url: string;
  /** `markup` as an image, for canvases. */
  image: HTMLImageElement;
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const IMAGE_SIZE = 256;

const ART = buildArt();

/** Bumps once every mark image has decoded, so canvases can repaint. */
export const markArtStore = new Store(0);

/** Resolves once every mark image can be drawn into a canvas. */
export const markArtReady: Promise<void> = Promise.all(
  POINT_MARKS.map((mark) => ART[mark].image.decode().catch(() => undefined)),
).then(() => {
  sprites.clear();
  markArtStore.setState((revision) => revision + 1);
});

/** Bounds of a characteristic's own size, a multiplier on its draw size. */
export const MARK_SIZE_MIN = 0.25;
export const MARK_SIZE_MAX = 12;

export function clampMarkSize(size: number): number {
  if (!Number.isFinite(size)) return 1;
  return Math.min(MARK_SIZE_MAX, Math.max(MARK_SIZE_MIN, size));
}

export function markRadius(scale: number, mark: PointMark, size = 1): number {
  return baseRadius(mark) * Math.max(scale, 0) * size;
}

function baseRadius(mark: PointMark): number {
  return MARK_KIND[mark] === "material"
    ? MARK_RADIUS * MATERIAL_SIZE
    : MARK_RADIUS;
}

/** How far a plain anchor snaps onto a mark, in image pixels. */
export function magnetReach(zoom: number, scale: number): number {
  const visual = MARK_RADIUS * Math.max(scale, 0) * 0.85;
  if (!(zoom > 0)) return visual;
  return Math.max(16 / zoom, visual);
}

/** Standalone SVG of the mark with its source strokes, for an `<img>`. */
export function markArtUrl(mark: PointMark): string {
  return ART[mark].url;
}

/** The mark's source group at a radius of one around the origin. */
export function pointMarkSvg(mark: PointMark): string {
  const art = ART[mark];
  return `<g transform="${art.unit}">${art.markup}</g>`;
}

type MarkContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Draws the mark centered on the origin. False until its image has decoded. */
export function drawPointMark(
  ctx: MarkContext,
  mark: PointMark,
  radius: number,
): boolean {
  const image = ART[mark].image;
  if (!(radius > 0) || !image.complete || image.naturalWidth === 0)
    return false;
  ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
  return true;
}

/** Past this device-pixel radius, drawing the SVG beats copying a large bitmap. */
const SPRITE_MAX_RADIUS = 160;
const SPRITE_LIMIT = 48;

type Sprite = OffscreenCanvas | HTMLCanvasElement;

const sprites = new Map<string, Sprite>();

/**
 * The mark rasterized once at this device-pixel `radius`, centered in a square
 * of even side. Recently used sizes stay cached. Null when too large or not decoded.
 */
export function markSprite(mark: PointMark, radius: number): Sprite | null {
  if (!(radius > 0) || radius > SPRITE_MAX_RADIUS) return null;
  const key = `${mark}:${radius}`;
  const cached = sprites.get(key);
  if (cached) {
    sprites.delete(key);
    sprites.set(key, cached);
    return cached;
  }
  const side = Math.ceil(radius) * 2;
  const sprite = spriteCanvas(side);
  const ctx = sprite.getContext("2d") as MarkContext | null;
  if (!ctx) return null;
  ctx.translate(side / 2, side / 2);
  if (!drawPointMark(ctx, mark, radius)) return null;
  sprites.set(key, sprite);
  if (sprites.size > SPRITE_LIMIT) {
    const oldest = sprites.keys().next().value;
    if (oldest !== undefined) sprites.delete(oldest);
  }
  return sprite;
}

function spriteCanvas(side: number): Sprite {
  if (typeof OffscreenCanvas !== "undefined")
    return new OffscreenCanvas(side, side);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  return canvas;
}

function buildArt(): Record<PointMark, MarkArt> {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const entries = POINT_MARKS.map((mark): [PointMark, MarkArt] => {
    const root = parser.parseFromString(
      ART_SOURCES[mark],
      "image/svg+xml",
    ).documentElement;
    const group = root.querySelector(":scope > g");
    if (!group) throw new Error(`point-marks/${mark}.svg has no group`);
    const [x = 0, y = 0, width = 0, height = 0] = (
      root.getAttribute("viewBox") ?? ""
    )
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const cx = x + width / 2;
    const cy = y + height / 2;
    const sourceHalf = Math.max(width, height) / 2;
    const url = markDocumentUrl(
      groupMarkup(group, mark, serializer),
      cx,
      cy,
      sourceHalf,
    );
    const half = fitStrokes(group, sourceHalf, baseRadius(mark));
    const markup = groupMarkup(group, mark, serializer);
    const image = new Image(IMAGE_SIZE, IMAGE_SIZE);
    image.decoding = "async";
    image.src = markDocumentUrl(markup, cx, cy, half);
    return [
      mark,
      {
        markup,
        unit: `scale(${1 / half}) translate(${-cx} ${-cy})`,
        url,
        image,
      },
    ];
  });
  return Object.fromEntries(entries) as Record<PointMark, MarkArt>;
}

/** The group with prefixed ids. */
function groupMarkup(
  group: Element,
  mark: PointMark,
  serializer: XMLSerializer,
): string {
  const clone = group.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll("[id]")]) {
    const id = node.getAttribute("id");
    if (id) node.setAttribute("id", `topo-mark-${mark}-${id}`);
  }
  return serializer
    .serializeToString(clone)
    .replace(` xmlns="${SVG_NAMESPACE}"`, "");
}

function markDocumentUrl(
  markup: string,
  cx: number,
  cy: number,
  half: number,
): string {
  const document = `<svg xmlns="${SVG_NAMESPACE}" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="${cx - half} ${cy - half} ${half * 2} ${half * 2}">${markup}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(document)}`;
}

/**
 * Sets every outline in `group` as thick as a line's dark edge at the mark's
 * draw size and returns the half side, in document units, that fits the art
 * with those strokes. `half` is the half side with the source strokes, and
 * `radius` the mark's half side in image pixels at draw scale 1.
 */
function fitStrokes(group: Element, half: number, radius: number): number {
  const stroked = [group, ...group.querySelectorAll("*")].filter(
    (node) =>
      !SOLID_STROKES.has(node.getAttribute("id") ?? "") &&
      STROKE_WIDTH.test(node.getAttribute("style") ?? ""),
  );
  let reach = 0;
  for (const node of stroked) {
    const width = Number(node.getAttribute("style")?.match(STROKE_WIDTH)?.[1]);
    reach = Math.max(reach, (width * rootScale(node)) / 2);
  }
  const underFill = (node: Element) =>
    PAINT_STROKE_FIRST.test(node.getAttribute("style") ?? "");
  const ratio = LINE_HALO / 2 / radius;
  const fitted =
    (half - reach) / (1 - (stroked.some(underFill) ? ratio : ratio / 2));
  for (const node of stroked) {
    const visible = underFill(node) ? 2 : 1;
    const width = (visible * ratio * fitted) / rootScale(node);
    const style = node.getAttribute("style") ?? "";
    node.setAttribute(
      "style",
      style.replace(STROKE_WIDTH, `stroke-width:${width}`),
    );
  }
  return fitted;
}

/** Linear scale from `node`'s units to the root `<svg>`'s. */
function rootScale(node: Element): number {
  let scale = 1;
  for (
    let at: Element | null = node;
    at && at.localName !== "svg";
    at = at.parentElement
  )
    scale *= transformScale(at.getAttribute("transform"));
  return scale;
}

function transformScale(transform: string | null): number {
  const match = transform?.match(/^\s*(matrix|scale)\(([^)]*)\)/);
  if (!match) return 1;
  const [a = 1, b = 0, c = 0, d = 1] = (match[2] ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (match[1] === "scale") return Math.sqrt(Math.abs(a * (b || a)));
  return Math.sqrt(Math.abs(a * d - b * c));
}
