import { batch, Store } from "@tanstack/store";
import { viewToContent } from "./line-editor.ts";
import {
  addFreeMark,
  anchorAt,
  lineStore,
  markOnLine,
  materialLanding,
  setAnchorMark,
  setLineHover,
  type MarkLanding,
} from "./lines.ts";
import {
  isFreeMark,
  magnetReach,
  MARK_KIND,
  markRadius,
  type PointMark,
} from "./point-marks.ts";
import { selectGroup } from "./tools.ts";
import type { ViewportState } from "./viewport.ts";

/** Where a dragged mark lands. Image pixels. */
export type MarkDropTarget = MarkLanding;

export type MarkDrag = {
  mark: PointMark;
  /** Client pixels. */
  x: number;
  y: number;
  /** Ghost side in CSS pixels, the size the mark lands at. */
  size: number;
  /** True while the pointer sits where the mark can land. */
  over: boolean;
  /** Route spot the mark would land on, in image pixels. */
  landing: { x: number; y: number } | null;
};

/** Mark being dragged from the palette. Its own store so only the ghost renders on move. */
export const markDragStore = new Store<MarkDrag | null>(null);

let target: MarkDropTarget | null = null;

export function markDragActive(): boolean {
  return markDragStore.get() !== null;
}

/** Image point under the client point. Null off the artboard or over a panel. */
export function stageDropPoint(
  clientX: number,
  clientY: number,
  stage: HTMLElement | null,
  view: Pick<ViewportState, "panX" | "panY" | "zoom">,
): { x: number; y: number } | null {
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  if (
    clientX < rect.left ||
    clientY < rect.top ||
    clientX > rect.right ||
    clientY > rect.bottom
  )
    return null;
  const under = document.elementFromPoint(clientX, clientY);
  if (!under || !stage.contains(under)) return null;
  if (under.closest("[data-widget], [data-point-menu]")) return null;
  return viewToContent(clientX, clientY, rect, view.panX, view.panY, view.zoom);
}

/** Where `mark` would land under the client point. Null off the artboard or over a panel. */
export function markDropTarget(
  mark: PointMark,
  clientX: number,
  clientY: number,
  stage: HTMLElement | null,
  view: Pick<ViewportState, "panX" | "panY" | "zoom">,
): MarkDropTarget | null {
  const point = stageDropPoint(clientX, clientY, stage, view);
  if (!point) return null;
  if (isFreeMark(mark)) return { type: "free", x: point.x, y: point.y };
  const state = lineStore.get();
  if (MARK_KIND[mark] === "material")
    return materialLanding(state, point.x, point.y, view.zoom);
  return (
    anchorAt(state, point.x, point.y, view.zoom) ?? {
      type: "free",
      x: point.x,
      y: point.y,
    }
  );
}

/** Moves the ghost and highlights where the mark would land. */
export function moveMarkDrag(
  mark: PointMark,
  clientX: number,
  clientY: number,
  next: MarkDropTarget | null,
  zoom: number,
): void {
  target = next;
  const scale = lineStore.get().scale;
  const size = Math.min(96, Math.max(16, markRadius(scale, mark) * zoom * 2));
  markDragStore.setState(() => ({
    mark,
    x: clientX,
    y: clientY,
    size,
    over: next !== null,
    landing: landingSpot(next),
  }));
  if (next?.type === "anchor") setLineHover(next);
  else if (next?.type === "line")
    setLineHover({ type: "stroke", layerId: next.layerId });
  else setLineHover(null);
}

/** Puts the mark where it was aimed, then ends the drag. */
export function dropMarkDrag(zoom: number): void {
  const drag = markDragStore.get();
  const hit = target;
  endMarkDrag();
  if (!drag || !hit) return;
  if (hit.type === "free") {
    batch(() => {
      addFreeMark(drag.mark, hit.x, hit.y);
      selectGroup("edit");
    });
    return;
  }
  if (hit.type === "line") {
    markOnLine(hit.layerId, hit.index, hit.x, hit.y, drag.mark);
    return;
  }
  setAnchorMark(
    hit.layerId,
    hit.index,
    drag.mark,
    magnetReach(zoom, lineStore.get().scale),
  );
}

function landingSpot(
  next: MarkDropTarget | null,
): { x: number; y: number } | null {
  if (next?.type === "line") return { x: next.x, y: next.y };
  if (next?.type !== "anchor") return null;
  const anchor = lineStore
    .get()
    .layers.find((layer) => layer.id === next.layerId)?.anchors[next.index];
  return anchor ? { x: anchor.x, y: anchor.y } : null;
}

export function endMarkDrag(): void {
  target = null;
  markDragStore.setState((current) => (current === null ? current : null));
  setLineHover(null);
}
