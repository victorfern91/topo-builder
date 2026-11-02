import { Store } from "@tanstack/store";
import type { RouteBadge } from "./route-number.ts";

export type PointMenuState = {
  x: number;
  y: number;
  layerId: string;
  deleteIndex: number | null;
  insert: { index: number; x: number; y: number } | null;
  /** Content point the number is added from. */
  at: { x: number; y: number };
  number: "add" | "remove" | null;
  /** Badge that `number` adds or removes. */
  badge: RouteBadge;
  /** Which of the route's number badges `remove` and edit act on. */
  badgeIndex: number;
};

/** Open point menu. Its own store so the artboard does not render with it. */
export const pointMenuStore = new Store<PointMenuState | null>(null);

/** Opens or closes the point menu without rendering the artboard. */
export function setPointMenu(next: PointMenuState | null): void {
  pointMenuStore.setState((current) => {
    if (next === null) return current === null ? current : null;
    return next;
  });
}

export function pointMenuOpen(): boolean {
  return pointMenuStore.get() !== null;
}
