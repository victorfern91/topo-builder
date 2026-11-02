import { Store } from "@tanstack/store";
import { lineStore, setLineHover } from "./lines.ts";
import { stageDropPoint } from "./mark-drag.ts";
import {
  addRouteNumber,
  badgeLandingAt,
  setNumberDrag,
} from "./route-badge.ts";
import type { RouteBadge } from "./route-number.ts";
import { selectGroup } from "./tools.ts";
import type { ViewportState } from "./viewport.ts";

/** Route and image point a dragged badge lands on. */
export type BadgeDropTarget = { layerId: string; x: number; y: number };

export type BadgeDrag = {
  badge: RouteBadge;
  /** Client pixels. */
  x: number;
  y: number;
  /** Line the badge would land beside. */
  layerId: string | null;
};

/** Badge being dragged from the palette. Its own store so only the ghost renders on move. */
export const badgeDragStore = new Store<BadgeDrag | null>(null);

let target: BadgeDropTarget | null = null;

/** Line whose band holds the client point. Null off the artboard, over a panel, or away from a route. */
export function badgeDropTarget(
  badge: RouteBadge,
  clientX: number,
  clientY: number,
  stage: HTMLElement | null,
  view: Pick<ViewportState, "panX" | "panY" | "zoom">,
): BadgeDropTarget | null {
  const point = stageDropPoint(clientX, clientY, stage, view);
  if (!point) return null;
  return badgeLandingAt(lineStore.get(), badge, point.x, point.y, view.zoom);
}

/** Moves the ghost and shows the band of the route it would land beside. */
export function moveBadgeDrag(
  badge: RouteBadge,
  clientX: number,
  clientY: number,
  next: BadgeDropTarget | null,
): void {
  target = next;
  badgeDragStore.setState(() => ({
    badge,
    x: clientX,
    y: clientY,
    layerId: next?.layerId ?? null,
  }));
  setNumberDrag(next ? { layerId: next.layerId, badge, index: null } : null);
  setLineHover(next ? { type: "stroke", layerId: next.layerId } : null);
}

/** Places the badge where it was aimed, then ends the drag. */
export function dropBadgeDrag(): void {
  const drag = badgeDragStore.get();
  const hit = target;
  endBadgeDrag();
  if (!drag || !hit) return;
  addRouteNumber(hit.layerId, drag.badge, hit.x, hit.y);
  selectGroup("edit");
}

export function endBadgeDrag(): void {
  target = null;
  badgeDragStore.setState((current) => (current === null ? current : null));
  setNumberDrag(null);
  setLineHover(null);
}
