import { Store } from "@tanstack/store";

export type PointMenuState = {
  x: number;
  y: number;
  layerId: string;
  deleteIndex: number | null;
  insert: { index: number; x: number; y: number } | null;
  /** Content point the number is added from. */
  at: { x: number; y: number };
  number: "add" | "remove" | null;
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
