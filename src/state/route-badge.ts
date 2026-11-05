import { Store } from "@tanstack/store";
import {
  edit,
  findLayer,
  HIT_PX,
  lineStore,
  patch,
  publish,
  strokeDistance2,
  type LineState,
} from "./lines.ts";
import {
  badgeSpot,
  badgeSpots,
  canHoldBadge,
  numberFromPointer,
  numberMagnet,
  readRouteNumber,
  sameRouteNumber,
  type RouteBadge,
  type RouteNumber,
} from "./route-number.ts";

/** `index` is null while a palette badge is aimed at the route. */
export type NumberDrag = {
  layerId: string;
  badge: RouteBadge;
  index: number | null;
};

/** Badge being dragged and its layer. Drives the magnet band. */
export const numberDragStore = new Store<NumberDrag | null>(null);

export function setNumberDrag(next: NumberDrag | null): void {
  numberDragStore.setState((current) =>
    current?.layerId === next?.layerId &&
    current?.badge === next?.badge &&
    current?.index === next?.index
      ? current
      : next,
  );
}

/** Slides the badge along the route and keeps it inside the magnet band. */
export function moveRouteNumber(
  layerId: string,
  badge: RouteBadge,
  index: number,
  x: number,
  y: number,
): void {
  edit(
    () => {
      const layer = findLayer(lineStore.get(), layerId);
      const current = layer ? readRouteNumber(layer, badge, index) : null;
      if (!layer || layer.locked || !current) return;
      const next = numberFromPointer(layer, x, y, current.side);
      if (!next || sameNumber(badgeSpot(layer, badge, index), next)) return;
      if (badge === "number")
        layer.routeNumbers = layer.routeNumbers.map((spot, at) =>
          at === index ? next : spot,
        );
      else layer.gradeBadge = next;
      publish();
    },
    `${badge}:${String(index)}:${layerId}`,
  );
}

/** Adds a number badge where the pointer sits inside the magnet band. The grade moves there instead. */
export function addRouteNumber(
  layerId: string,
  badge: RouteBadge,
  x: number,
  y: number,
): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked || !canHoldBadge(layer, badge)) return;
    const next = numberFromPointer(layer, x, y, 1);
    if (!next) return;
    if (badge === "number") {
      layer.routeNumbers = [...layer.routeNumbers, next];
    } else {
      if (sameNumber(layer.gradeBadge, next)) return;
      layer.gradeBadge = next;
    }
    publish();
  });
}

/** Removes one badge. `index` picks the number badge; the grade has one. */
export function clearRouteNumber(
  layerId: string,
  badge: RouteBadge,
  index: number,
): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked || !badgeSpot(layer, badge, index)) return;
    if (badge === "number")
      layer.routeNumbers = layer.routeNumbers.filter((_, at) => at !== index);
    else layer.gradeBadge = null;
    publish();
  });
}

/** Removes every badge of this kind from the line. */
export function clearRouteNumbers(layerId: string, badge: RouteBadge): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked || badgeSpots(layer, badge).length === 0) return;
    if (badge === "number") layer.routeNumbers = [];
    else layer.gradeBadge = null;
    publish();
  });
}

/**
 * Replaces the layer through the draft, so the layers panel field re-renders.
 * An in-place write only bumps the revision, which the canvas sees and the panel does not.
 */
export function setNumberText(id: string, text: string): void {
  edit(() => {
    patch((draft) => {
      const layer = draft.layers.find((item) => item.id === id);
      if (!layer || layer.locked || layer.numberText === text) return;
      layer.numberText = text;
      draft.revision += 1;
    });
  });
}

/** Unlocked line that can hold the badge, whose magnet band holds (x, y). */
export function badgeLandingAt(
  state: LineState,
  badge: RouteBadge,
  x: number,
  y: number,
  zoom: number,
): { layerId: string; x: number; y: number } | null {
  const reach = Math.max(numberMagnet().reach, zoom > 0 ? HIT_PX / zoom : 0);
  let best: { layerId: string; x: number; y: number } | null = null;
  let bestDist = reach * reach;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || layer.locked || !canHoldBadge(layer, badge)) continue;
    const dist = strokeDistance2(layer, x, y);
    if (dist >= bestDist) continue;
    best = { layerId: layer.id, x, y };
    bestDist = dist;
  }
  return best;
}

function sameNumber(a: RouteNumber | null, b: RouteNumber): boolean {
  return a !== null && sameRouteNumber(a, b);
}
