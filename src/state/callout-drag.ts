import { Store } from "@tanstack/store";
import { addExit, addLabel, addNote, noteLandingAt } from "./callouts.ts";
import { lineStore, setLineHover } from "./lines.ts";
import { stageDropPoint } from "./mark-drag.ts";
import { selectGroup } from "./tools.ts";
import type { ViewportState } from "./viewport.ts";

export type CalloutTool = "note" | "label" | "exit";

export type CalloutDrag = {
  kind: CalloutTool;
  /** Client pixels. */
  x: number;
  y: number;
  /** Route a note would land beside. */
  layerId: string | null;
  /** True while the pointer sits where this callout can land. */
  over: boolean;
};

/** Callout being dragged from the marks panel. The ghost is the only thing that moves. */
export const calloutDragStore = new Store<CalloutDrag | null>(null);

let point: { x: number; y: number } | null = null;
let routeId: string | null = null;

export function calloutDragActive(): boolean {
  return calloutDragStore.get() !== null;
}

export function moveCalloutDrag(
  kind: CalloutTool,
  clientX: number,
  clientY: number,
  stage: HTMLElement | null,
  view: Pick<ViewportState, "panX" | "panY" | "zoom">,
): void {
  const at = stageDropPoint(clientX, clientY, stage, view);
  point = at;
  const landing =
    at && kind === "note"
      ? noteLandingAt(lineStore.get(), at.x, at.y, view.zoom)
      : null;
  routeId = landing?.layerId ?? null;
  calloutDragStore.setState(() => ({
    kind,
    x: clientX,
    y: clientY,
    layerId: routeId,
    over: kind === "note" ? landing !== null : at !== null,
  }));
  setLineHover(landing ? { type: "stroke", layerId: landing.layerId } : null);
}

/** Places the callout where it was aimed, then ends the drag. */
export function dropCalloutDrag(): void {
  const drag = calloutDragStore.get();
  const at = point;
  const landedOn = routeId;
  endCalloutDrag();
  if (!drag || !at) return;
  if (drag.kind === "note") {
    if (!landedOn) return;
    addNote(landedOn, at.x, at.y);
  } else if (drag.kind === "label") {
    addLabel(at.x, at.y);
  } else {
    addExit(at.x, at.y);
  }
  selectGroup("edit");
}

export function endCalloutDrag(): void {
  point = null;
  routeId = null;
  calloutDragStore.setState((current) => (current === null ? current : null));
  setLineHover(null);
}
