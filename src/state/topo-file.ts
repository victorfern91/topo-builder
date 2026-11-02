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
import { POINT_MARKS, type PointMark } from "./point-marks.ts";
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

export function isTopoFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(`.${TOPO_EXTENSION}`);
}

/** `<metadata>` with every line, anchor, and mark at full precision. */
export function topoMetadata(doc: LineState, source: string): string {
  const lines = doc.layers.map((layer) => {
    const number = layer.routeNumber
      ? ` number-t="${String(layer.routeNumber.t)}" number-side="${String(layer.routeNumber.side)}"`
      : "";
    const grade = layer.grade === null ? "" : ` grade="${layer.grade}"`;
    const anchors = layer.anchors.map((anchor) => {
      const point = anchor.pointId
        ? ` point="${escapeXml(anchor.pointId)}"`
        : "";
      return `<topo:anchor x="${String(anchor.x)}" y="${String(anchor.y)}"${point}/>`;
    });
    return [
      `<topo:line id="${escapeXml(layer.id)}" kind="${layer.kind}" name="${escapeXml(layer.name)}" color="${escapeXml(layer.color)}" scale="${String(layer.scale)}" locked="${layer.locked}"${grade}${number}>`,
      ...anchors,
      `</topo:line>`,
    ].join("\n");
  });
  const points = doc.points.map(
    (point) =>
      `<topo:point id="${escapeXml(point.id)}" x="${String(point.x)}" y="${String(point.y)}" mark="${point.mark}"/>`,
  );
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
    const id = text(node, "id");
    if (points.has(id)) invalid();
    points.set(id, {
      id,
      x: number(node, "x"),
      y: number(node, "y"),
      mark: oneOf<PointMark>(node, "mark", POINT_MARKS),
    });
  }

  const ids = new Set<string>();
  const used = new Set<string>();
  const layers = children(root, "line").map((node): LineLayer => {
    const id = text(node, "id");
    if (ids.has(id)) invalid();
    ids.add(id);
    const anchors = children(node, "anchor").map((anchorNode): Anchor => {
      const point = points.get(anchorNode.getAttribute("point") ?? "");
      if (point) used.add(point.id);
      return point
        ? { x: point.x, y: point.y, pointId: point.id }
        : {
            x: number(anchorNode, "x"),
            y: number(anchorNode, "y"),
            pointId: null,
          };
    });
    const grade = node.getAttribute("grade");
    return {
      id,
      name: node.getAttribute("name") ?? "",
      kind: oneOf<CreateToolId>(node, "kind", CREATE_TOOLS),
      color: text(node, "color"),
      anchors,
      scale: clampDrawScale(number(node, "scale")),
      geometryRevision: 0,
      locked: node.getAttribute("locked") === "true",
      routeNumber: node.hasAttribute("number-t")
        ? { t: number(node, "number-t"), side: number(node, "number-side") }
        : null,
      grade: grade === null ? null : integer(grade),
    };
  });

  return {
    photo: await embeddedPhoto(xml, text(root, "source")),
    drawing: {
      layers,
      points: [...points.values()].filter((point) => used.has(point.id)),
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
