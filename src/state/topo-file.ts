import { t } from "../i18n/index.ts";
import { TopoError } from "./errors.ts";
import { failImageFile, openImageFile } from "./image-document.ts";
import {
  clampDrawScale,
  loadDrawing,
  type Anchor,
  type LineLayer,
  type LineState,
  type MarkedPoint,
} from "./lines.ts";
import {
  clampMarkSize,
  MARK_LABEL,
  POINT_MARKS,
  type PointMark,
} from "./point-marks.ts";
import { DEFAULT_NUMBER_TEXT, type RouteNumber } from "./route-number.ts";
import { isGrade } from "./grade.ts";
import { escapeXml } from "./svg.ts";
import { CREATE_TOOLS, type CreateToolId } from "./tools.ts";

/**
 * A `.topo` file is the SVG export plus a `<metadata>` block in this namespace.
 * Any SVG reader shows the artwork. Topo reads the metadata back to edit it.
 */
export const TOPO_NAMESPACE = "https://topo-builder.app/ns/topo/1";
export const TOPO_EXTENSION = "topo";
export const TOPO_PHOTO_ID = "topo-photo";
const TOPO_VERSION = 1;

const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

/** Marks older files may hold. Their anchors open as plain points. */
const RETIRED_MARKS = new Set(["bolt", "ring", "belay", "rappel"]);

export function isTopoFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(`.${TOPO_EXTENSION}`);
}

/** `<metadata>` with every line, anchor, and mark at full precision. */
export function topoMetadata(doc: LineState, source: string): string {
  const lines = doc.layers.map((layer) => {
    const numbers = layer.routeNumbers.map(
      (spot) => `<topo:number${spotAttributes("", spot)}/>`,
    );
    const numberText = ` number-text="${escapeXml(layer.numberText)}"`;
    const gradeBadge = spotAttributes("grade", layer.gradeBadge);
    const grade = layer.grade === null ? "" : ` grade="${layer.grade}"`;
    const anchors = layer.anchors.map((anchor) => {
      const point = anchor.pointId
        ? ` point="${escapeXml(anchor.pointId)}"`
        : "";
      return `<topo:anchor x="${String(anchor.x)}" y="${String(anchor.y)}"${point}/>`;
    });
    return [
      `<topo:line id="${escapeXml(layer.id)}" kind="${layer.kind}" name="${escapeXml(layer.name)}" color="${escapeXml(layer.color)}" scale="${String(layer.scale)}" locked="${layer.locked}"${grade}${numberText}${gradeBadge}>`,
      ...anchors,
      ...numbers,
      `</topo:line>`,
    ].join("\n");
  });
  const points = doc.points.map((point) => {
    const size = point.size === 1 ? "" : ` size="${String(point.size)}"`;
    const locked = point.locked ? ` locked="true"` : "";
    return `<topo:point id="${escapeXml(point.id)}" x="${String(point.x)}" y="${String(point.y)}" mark="${point.mark}" name="${escapeXml(point.name)}"${size}${locked}/>`;
  });
  return [
    `<metadata>`,
    `<topo:document version="${TOPO_VERSION}" source="${escapeXml(source)}" scale="${String(doc.scale)}">`,
    ...lines,
    ...points,
    `</topo:document>`,
    `</metadata>`,
  ].join("\n");
}

/** Puts the embedded photo on the board, then restores the drawing on top of it. */
export async function openTopoFile(file: File): Promise<void> {
  try {
    const { photo, drawing } = await readTopoFile(file);
    openImageFile(photo, () => loadDrawing(drawing));
  } catch {
    failImageFile(file.name, "TOPO_FILE_INVALID");
  }
}

type TopoDrawing = Pick<LineState, "layers" | "points" | "scale">;

async function readTopoFile(
  file: File,
): Promise<{ photo: File; drawing: TopoDrawing }> {
  const xml = new DOMParser().parseFromString(
    await file.text(),
    "image/svg+xml",
  );
  if (xml.getElementsByTagName("parsererror").length > 0) invalid();
  const root = xml.getElementsByTagNameNS(TOPO_NAMESPACE, "document")[0];
  if (!root || Number(root.getAttribute("version")) > TOPO_VERSION) invalid();

  const points = new Map<string, MarkedPoint>();
  for (const node of children(root, "point")) {
    if (RETIRED_MARKS.has(node.getAttribute("mark") ?? "")) continue;
    const id = text(node, "id");
    if (points.has(id)) invalid();
    const mark = oneOf<PointMark>(node, "mark", POINT_MARKS);
    points.set(id, {
      id,
      x: number(node, "x"),
      y: number(node, "y"),
      mark,
      size: node.hasAttribute("size") ? clampMarkSize(number(node, "size")) : 1,
      name: node.getAttribute("name") ?? t(MARK_LABEL[mark]),
      locked: node.getAttribute("locked") === "true",
    });
  }

  const ids = new Set<string>();
  const layers = children(root, "line").map((node): LineLayer => {
    const id = text(node, "id");
    if (ids.has(id)) invalid();
    ids.add(id);
    const anchors = children(node, "anchor").map((anchorNode): Anchor => {
      const point = points.get(anchorNode.getAttribute("point") ?? "");
      return point
        ? { x: point.x, y: point.y, pointId: point.id }
        : {
            x: number(anchorNode, "x"),
            y: number(anchorNode, "y"),
            pointId: null,
          };
    });
    const kind = oneOf<CreateToolId>(node, "kind", CREATE_TOOLS);
    const grade = readGrade(node, kind);
    return {
      id,
      name: node.getAttribute("name") ?? "",
      kind,
      color: text(node, "color"),
      anchors,
      scale: clampDrawScale(number(node, "scale")),
      geometryRevision: 0,
      locked: node.getAttribute("locked") === "true",
      routeNumbers: readNumbers(node),
      numberText: node.getAttribute("number-text") ?? DEFAULT_NUMBER_TEXT,
      gradeBadge: readSpot(node, "grade"),
      grade,
    };
  });

  return {
    photo: await embeddedPhoto(xml, text(root, "source")),
    drawing: {
      layers,
      points: [...points.values()],
      scale: clampDrawScale(number(root, "scale")),
    },
  };
}

async function embeddedPhoto(xml: Document, source: string): Promise<File> {
  const image = xml.getElementById(TOPO_PHOTO_ID);
  const href =
    image?.getAttributeNS(XLINK_NAMESPACE, "href") ??
    image?.getAttribute("href");
  if (!href?.startsWith("data:image/")) invalid();
  const blob = await (await fetch(href)).blob();
  return new File([blob], source, { type: blob.type });
}

/** An empty prefix writes plain `t`, `side`, `along`. `along` is written only past a route end. */
function spotAttributes(prefix: string, spot: RouteNumber | null): string {
  if (!spot) return "";
  const name = (key: string) => (prefix ? `${prefix}-${key}` : key);
  const along =
    spot.along === 0 ? "" : ` ${name("along")}="${String(spot.along)}"`;
  return ` ${name("t")}="${String(spot.t)}" ${name("side")}="${String(spot.side)}"${along}`;
}

function readSpot(node: Element, prefix: string): RouteNumber | null {
  const name = (key: string) => (prefix ? `${prefix}-${key}` : key);
  if (!node.hasAttribute(name("t"))) return null;
  return {
    t: number(node, name("t")),
    side: number(node, name("side")),
    along: node.hasAttribute(name("along")) ? number(node, name("along")) : 0,
  };
}

/** `<topo:number>` children. Older files hold one badge as `number-*` attributes on the line. */
function readNumbers(node: Element): RouteNumber[] {
  const legacy = readSpot(node, "number");
  const spots = children(node, "number").map((child) => readSpot(child, ""));
  return [
    ...(legacy ? [legacy] : []),
    ...spots.filter((spot) => spot !== null),
  ];
}

function children(parent: Element, name: string): Element[] {
  return [...parent.children].filter(
    (node) => node.namespaceURI === TOPO_NAMESPACE && node.localName === name,
  );
}

function text(node: Element, name: string): string {
  const value = node.getAttribute(name);
  if (!value) invalid();
  return value;
}

function number(node: Element, name: string): number {
  const value = Number(text(node, name));
  if (!Number.isFinite(value)) invalid();
  return value;
}

/** A step on the line's own scale. A step off that scale is refused. */
function readGrade(node: Element, kind: CreateToolId): number | null {
  const raw = node.getAttribute("grade");
  if (raw === null) return null;
  const grade = integer(raw);
  if (!isGrade(kind, grade)) invalid();
  return grade;
}

function integer(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value)) invalid();
  return value;
}

function oneOf<T extends string>(
  node: Element,
  name: string,
  allowed: readonly T[],
): T {
  const value = text(node, name);
  if (!(allowed as readonly string[]).includes(value)) invalid();
  return value as T;
}

function invalid(): never {
  throw new TopoError("TOPO_FILE_INVALID");
}
