import { createContext, useContext, useLayoutEffect, useRef } from "react";
import type { LineHit, LineState } from "../../state/lines.ts";
import type { MarkDrag } from "../../state/mark-drag.ts";
import type { NumberDrag } from "../../state/route-badge.ts";
import type { ViewportState } from "../../state/viewport.ts";

/** One-frame snapshot. Layers read this instead of stores mid-paint. */
export type PaintFrame = {
  ctx: CanvasRenderingContext2D;
  doc: LineState;
  view: ViewportState;
  dpr: number;
  hover: LineHit | null;
  drag: MarkDrag | null;
  numberDrag: NumberDrag | null;
  materialGrab: boolean;
};

export type PaintFn = (frame: PaintFrame) => void;

export type PaintRegistry = {
  register: (paint: PaintFn) => () => void;
};

export const PaintRegistryContext = createContext<PaintRegistry | null>(null);

/** Image pixels: zoom and pan already applied. */
export function withImageSpace(frame: PaintFrame): void {
  const { ctx, view, dpr } = frame;
  ctx.setTransform(
    dpr * view.zoom,
    0,
    0,
    dpr * view.zoom,
    dpr * view.panX,
    dpr * view.panY,
  );
}

/** CSS pixels relative to the viewport. */
export function withDeviceSpace(frame: PaintFrame): void {
  const { ctx, dpr } = frame;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Registers a paint pass. Order follows the React tree. The surface paints once
 * per frame; this component renders no DOM.
 */
export function usePaintLayer(paint: PaintFn): void {
  const registry = useContext(PaintRegistryContext);
  if (!registry) {
    throw new Error("usePaintLayer needs a CanvasSurface");
  }
  const paintRef = useRef(paint);
  useLayoutEffect(() => {
    paintRef.current = paint;
  });
  useLayoutEffect(() => {
    return registry.register((frame) => {
      paintRef.current(frame);
    });
  }, [registry]);
}
