import type { GradeSystem } from "./grade.ts";
import { TopoError } from "./errors.ts";
import { imageDocumentStore } from "./image-document.ts";
import { lineGeometry, type CurveOp } from "./line-curve.ts";
import {
  BADGE_EDGE,
  BADGE_FILL,
  BADGE_TEXT,
  exportInk,
  lineStroke,
  paintArtwork,
} from "./line-paint.ts";
import { lineStore, type LineState } from "./lines.ts";
import {
  MARK_LABEL,
  markArtReady,
  markRadius,
  POINT_MARKS,
  pointMarkSvg,
  type PointMark,
} from "./point-marks.ts";
import { preferencesStore } from "./preferences.ts";
import {
  NUMBER_FONT_FAMILY,
  NUMBER_FONT_SIZE,
  NUMBER_FONT_WEIGHT,
  numberBadge,
  numberLabel,
  routeNumberPlacement,
} from "./route-number.ts";
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

const JPEG_QUALITY = 0.92;

/** Photo with every line, mark, and number at the photo's own pixel size. Downloads the file. */
export async function exportTopo(format: ExportFormat): Promise<void> {
  const image = imageDocumentStore.get();
  if (image.status !== "ready") throw new TopoError("EXPORT_NO_IMAGE");
  const photo = await loadPhoto(image.objectUrl);
  const doc = lineStore.get();
  const system = preferencesStore.get().gradeSystem;
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
  download(blob, exportName(image.fileName, format));
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
  system: GradeSystem,
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
  system: GradeSystem,
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

    const place = routeNumberPlacement(layer);
    if (place) {
      const label = numberLabel(index + 1, layer.grade, system);
      const badge = numberBadge(label);
      parts.push(
        `<g id="${id(`${routeId}-number`, "number")}" inkscape:label="${escapeXml(t("numberLayer"))}" transform="translate(${n(place.x)} ${n(place.y)}) scale(${n(ink)})">`,
        `<rect x="${n(-badge.width / 2)}" y="${n(-badge.height / 2)}" width="${n(badge.width)}" height="${n(badge.height)}" rx="${n(badge.height / 2)}" ry="${n(badge.height / 2)}" ${svgPaint("fill", BADGE_FILL)} ${svgPaint("stroke", layer.color)} stroke-width="${n(BADGE_EDGE)}"/>`,
        `<text x="0" y="${n(NUMBER_FONT_SIZE * 0.35)}" text-anchor="middle" font-family="${escapeXml(NUMBER_FONT_FAMILY.replace(/"/g, "'"))}" font-size="${NUMBER_FONT_SIZE}" font-weight="${Math.round(NUMBER_FONT_WEIGHT / 100) * 100}" ${svgPaint("fill", BADGE_TEXT)}>${escapeXml(label)}</text>`,
        `</g>`,
      );
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
