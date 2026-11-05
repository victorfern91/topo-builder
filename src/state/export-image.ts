import { TopoError } from "./errors.ts";
import { imageDocumentStore } from "./image-document.ts";
import { lineGeometry, type CurveOp } from "./line-curve.ts";
import {
  BADGE_EDGE,
  BADGE_EDGE_COLOR,
  BADGE_FILL,
  BADGE_TEXT,
} from "../components/canvas/paint/badges.ts";
import { exportInk, paintArtwork } from "../components/canvas/paint/artwork.ts";
import { lineStroke } from "../components/canvas/paint/routes.ts";
import { lineStore, type LineState } from "./lines.ts";
import {
  MARK_LABEL,
  markArtReady,
  markRadius,
  POINT_MARKS,
  pointMarkSvg,
  type PointMark,
} from "./point-marks.ts";
import {
  BADGE_TYPE,
  badgeInk,
  badgeLabel,
  badgeSpots,
  loadBadgeFonts,
  numberBadge,
  ROUTE_BADGES,
  routeNumberPlacement,
} from "./route-number.ts";
import { gradeSystems, preferencesStore } from "./preferences.ts";
import type { GradeSystems } from "./grade.ts";
import { escapeXml, svgIdFactory, svgNumber as n, svgPaint } from "./svg.ts";
import { t } from "../i18n/index.ts";
import { rgbaToTiffBlob } from "./tiff.ts";
import {
  TOPO_EXTENSION,
  TOPO_NAMESPACE,
  TOPO_PHOTO_ID,
  topoMetadata,
} from "./topo-file.ts";

export const EXPORT_FORMATS = ["png", "jpeg", "tiff", "svg", "topo"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

type VectorFormat = "svg" | "topo";

const EXTENSION: Record<ExportFormat, string> = {
  png: "png",
  jpeg: "jpg",
  tiff: "tif",
  svg: "svg",
  topo: TOPO_EXTENSION,
};

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  topo: "image/svg+xml",
};

const FORMAT_LABEL: Record<ExportFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  tiff: "TIFF",
  svg: "SVG",
  topo: "Topo",
};

const JPEG_QUALITY = 0.92;

type SaveTarget = FileSystemFileHandle | "download";

/** Photo with every line, mark, and number at the photo's own pixel size. Asks where to save. */
export async function exportTopo(format: ExportFormat): Promise<void> {
  const image = imageDocumentStore.get();
  if (image.status !== "ready") throw new TopoError("EXPORT_NO_IMAGE");
  const fileName = exportName(image.fileName, format);
  // Pick the path while the click still counts as a user gesture.
  const target = await resolveSaveTarget(fileName, format);
  if (!target) return;
  const photo = await loadPhoto(image.objectUrl);
  const doc = lineStore.get();
  const system = gradeSystems(preferencesStore.get());
  const blob =
    format === "svg" || format === "topo"
      ? await svgBlob(
          photo,
          image.objectUrl,
          image.fileName,
          doc,
          system,
          format,
        )
      : await markArtReady.then(() => rasterBlob(photo, doc, system, format));
  await saveBlob(blob, fileName, target);
}

export function exportExtension(format: ExportFormat): string {
  return EXTENSION[format];
}

export function exportName(fileName: string, format: ExportFormat): string {
  const base = fileName.replace(/\.[^./\\]+$/, "") || "topo";
  if (format === "topo") return `${base}.${EXTENSION[format]}`;
  return `${base}-topo.${EXTENSION[format]}`;
}

async function rasterBlob(
  photo: HTMLImageElement,
  doc: LineState,
  system: GradeSystems,
  format: Exclude<ExportFormat, VectorFormat>,
): Promise<Blob> {
  const width = photo.naturalWidth;
  const height = photo.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new TopoError("EXPORT_CANVAS_UNAVAILABLE");
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(photo, 0, 0, width, height);
  await loadBadgeFonts();
  paintArtwork(ctx, doc, system);
  if (format === "tiff") {
    return rgbaToTiffBlob(
      ctx.getImageData(0, 0, width, height).data,
      width,
      height,
    );
  }
  const type = format === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, JPEG_QUALITY);
  });
  if (!blob) throw new TopoError("EXPORT_ENCODE_FAILED");
  return blob;
}

/** Raster formats every SVG editor can show inside `<image>`. */
const EMBEDDABLE = new Set(["image/png", "image/jpeg"]);

/**
 * SVG 1.1 with Inkscape layers: the photo (locked), one layer per route named
 * after it, then the shared point marks on top. `topo` adds the editable drawing as metadata.
 */
async function svgBlob(
  photo: HTMLImageElement,
  objectUrl: string,
  fileName: string,
  doc: LineState,
  system: GradeSystems,
  format: VectorFormat,
): Promise<Blob> {
  const width = photo.naturalWidth;
  const height = photo.naturalHeight;
  const href = await embeddedPhoto(photo, objectUrl);
  const ink = exportInk(doc);
  const id = svgIdFactory();
  const layerAttrs = (layerId: string, label: string) =>
    `id="${layerId}" inkscape:groupmode="layer" inkscape:label="${escapeXml(label)}"`;

  const topo = format === "topo";
  const topoNamespace = topo ? ` xmlns:topo="${TOPO_NAMESPACE}"` : "";
  const photoId = topo ? ` id="${id(TOPO_PHOTO_ID, "photo")}"` : "";

  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"${topoNamespace} version="1.1" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<title>${escapeXml(fileName)}</title>`,
    ...(topo ? [topoMetadata(doc, fileName)] : []),
    `<g ${layerAttrs(id("photo", "photo"), t("photoLayer"))} sodipodi:insensitive="true">`,
    `<image${photoId} x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" xlink:href="${href}"/>`,
    `</g>`,
  ];

  for (let index = 0; index < doc.layers.length; index += 1) {
    const layer = doc.layers[index];
    if (!layer || layer.anchors.length < 2) continue;
    const name = layer.name.trim() || `${t("routeKind")} ${index + 1}`;
    const routeId = id(name, "route");
    parts.push(
      `<g ${layerAttrs(routeId, name)}>`,
      `<title>${escapeXml(name)}</title>`,
    );

    const d = pathData(
      lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops,
    );
    const stroke = lineStroke(layer);
    const dash =
      stroke.dash.length > 0
        ? ` stroke-dasharray="${stroke.dash.map(n).join(" ")}"`
        : "";
    parts.push(
      `<g id="${id(`${routeId}-line`, "line")}" inkscape:label="${escapeXml(t("lineLayer"))}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dash}>`,
      `<path id="${id(`${routeId}-halo`, "halo")}" d="${d}" ${svgPaint("stroke", stroke.halo)} stroke-width="${n(stroke.haloWidth)}"/>`,
      `<path id="${id(`${routeId}-stroke`, "stroke")}" d="${d}" ${svgPaint("stroke", stroke.color)} stroke-width="${n(stroke.width)}"/>`,
      `</g>`,
    );

    for (const kind of ROUTE_BADGES) {
      const label = badgeLabel(layer, kind, system);
      if (!label) continue;
      const badge = numberBadge(label, kind);
      const type = BADGE_TYPE[kind];
      const text = badgeInk(label, kind);
      const count = badgeSpots(layer, kind).length;
      for (let index = 0; index < count; index += 1) {
        const place = routeNumberPlacement(layer, kind, index);
        if (!place) continue;
        const key =
          index === 0
            ? `${routeId}-${kind}`
            : `${routeId}-${kind}-${String(index + 1)}`;
        const rim = BADGE_EDGE / 2;
        parts.push(
          `<g id="${id(key, kind)}" inkscape:label="${escapeXml(t(kind === "number" ? "numberLayer" : "layerGrade"))}" transform="translate(${n(place.x)} ${n(place.y)}) scale(${n(ink)})">`,
          `<rect x="${n(-badge.width / 2)}" y="${n(-badge.height / 2)}" width="${n(badge.width)}" height="${n(badge.height)}" rx="${n(badge.height / 2)}" ry="${n(badge.height / 2)}" ${svgPaint("fill", BADGE_FILL)}/>`,
        );
        if (kind === "number") {
          parts.push(
            `<rect x="${n(-badge.width / 2 - rim)}" y="${n(-badge.height / 2 - rim)}" width="${n(badge.width + BADGE_EDGE)}" height="${n(badge.height + BADGE_EDGE)}" rx="${n(badge.height / 2 + rim)}" ry="${n(badge.height / 2 + rim)}" fill="none" ${svgPaint("stroke", BADGE_EDGE_COLOR)} stroke-width="${n(BADGE_EDGE)}"/>`,
          );
        }
        parts.push(
          `<text x="${n(text.x)}" y="${n(text.y)}" text-anchor="middle" font-family="${escapeXml(type.family.replace(/"/g, "'"))}" font-size="${type.size}" font-weight="${Math.round(type.weight / 100) * 100}" ${svgPaint("fill", BADGE_TEXT)}>${escapeXml(label)}</text>`,
          `</g>`,
        );
      }
    }
    parts.push(`</g>`);
  }

  if (doc.points.length > 0 && doc.scale > 0) {
    const symbols = new Map<PointMark, string>();
    for (const mark of POINT_MARKS) {
      if (doc.points.some((point) => point.mark === mark))
        symbols.set(mark, id(`symbol-${mark}`, "symbol"));
    }
    parts.push(`<defs>`);
    for (const [mark, symbolId] of symbols) {
      parts.push(
        `<g id="${symbolId}" inkscape:label="${escapeXml(t(MARK_LABEL[mark]))}">${pointMarkSvg(mark)}</g>`,
      );
    }
    parts.push(`</defs>`);
    parts.push(`<g ${layerAttrs(id("marks", "marks"), t("pointMarks"))}>`);
    for (const point of doc.points) {
      const label = t(MARK_LABEL[point.mark]);
      parts.push(
        `<use id="${id(`mark-${label}`, "mark")}" inkscape:label="${escapeXml(label)}" xlink:href="#${symbols.get(point.mark) ?? ""}" transform="translate(${n(point.x)} ${n(point.y)}) scale(${n(markRadius(doc.scale, point.mark, point.size))})"/>`,
      );
    }
    parts.push(`</g>`);
  }

  parts.push(`</svg>`, "");
  return new Blob([parts.join("\n")], { type: "image/svg+xml" });
}

/** PNG and JPEG embed as they are. Other formats are re-encoded as PNG. */
async function embeddedPhoto(
  photo: HTMLImageElement,
  objectUrl: string,
): Promise<string> {
  let source: Blob;
  try {
    source = await (await fetch(objectUrl)).blob();
  } catch (cause) {
    throw new TopoError("EXPORT_IMAGE_UNREADABLE", { cause });
  }
  if (EMBEDDABLE.has(source.type)) return blobToDataUrl(source);
  const canvas = document.createElement("canvas");
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new TopoError("EXPORT_CANVAS_UNAVAILABLE");
  ctx.drawImage(photo, 0, 0);
  const png = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!png) throw new TopoError("EXPORT_ENCODE_FAILED");
  return blobToDataUrl(png);
}

function pathData(ops: readonly CurveOp[]): string {
  let d = "";
  for (const op of ops) {
    if (op.op === "C") {
      d += `C${n(op.c1x)} ${n(op.c1y)} ${n(op.c2x)} ${n(op.c2y)} ${n(op.x)} ${n(op.y)}`;
    } else {
      d += `${op.op}${n(op.x)} ${n(op.y)}`;
    }
  }
  return d;
}

function loadPhoto(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const photo = new Image();
    photo.onload = () => {
      if (photo.naturalWidth > 0 && photo.naturalHeight > 0) resolve(photo);
      else reject(new TopoError("EXPORT_IMAGE_UNREADABLE"));
    };
    photo.onerror = () => reject(new TopoError("EXPORT_IMAGE_UNREADABLE"));
    photo.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new TopoError("EXPORT_IMAGE_UNREADABLE"));
    };
    reader.onerror = () =>
      reject(new TopoError("EXPORT_IMAGE_UNREADABLE", { cause: reader.error }));
    reader.readAsDataURL(blob);
  });
}

/** `null` when the user dismisses the save dialog. */
async function resolveSaveTarget(
  fileName: string,
  format: ExportFormat,
): Promise<SaveTarget | null> {
  if (!canShowSaveFilePicker()) return "download";
  try {
    const handle = await showSaveFilePicker({
      suggestedName: fileName,
      excludeAcceptAllOption: true,
      types: [
        {
          description: FORMAT_LABEL[format],
          accept: { [MIME[format]]: [`.${EXTENSION[format]}`] },
        },
      ],
    });
    return handle;
  } catch (error) {
    if (isAbortError(error)) return null;
    return "download";
  }
}

async function saveBlob(
  blob: Blob,
  fileName: string,
  target: SaveTarget,
): Promise<void> {
  if (target === "download") {
    download(blob, fileName);
    return;
  }
  const writable = await target.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
}

function canShowSaveFilePicker(): boolean {
  if (!("showSaveFilePicker" in window)) return false;
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Declared here: TypeScript’s DOM lib has the handle types but not this method yet. */
declare function showSaveFilePicker(
  options?: SaveFilePickerOptions,
): Promise<FileSystemFileHandle>;

type SaveFilePickerOptions = {
  suggestedName?: string;
  excludeAcceptAllOption?: boolean;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
