import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { dropLineGeometry } from "../../state/line-curve.ts";
import {
  lineHoverStore,
  lineStore,
  materialGrabStore,
} from "../../state/lines.ts";
import { markDragStore } from "../../state/mark-drag.ts";
import { markArtStore } from "../../state/point-marks.ts";
import { preferencesStore } from "../../state/preferences.ts";
import { numberDragStore } from "../../state/route-badge.ts";
import { dropRouteSpans, loadBadgeFonts } from "../../state/route-number.ts";
import { viewportStore } from "../../state/viewport.ts";
import { stage } from "../../styles/stage.ts";
import {
  PaintRegistryContext,
  type PaintFn,
  type PaintFrame,
  type PaintRegistry,
} from "./use-paint-layer.ts";

/** The parts of a palette drag the canvas paints. Ghost moves alone skip a repaint. */
function markDragKey(): string {
  const drag = markDragStore.get();
  if (!drag) return "";
  const at = drag.landing;
  return at ? `${drag.mark}:${at.x}:${at.y}` : drag.mark;
}

type CanvasSurfaceProps = {
  children: ReactNode;
};

/**
 * One canvas, one rAF loop. Children register paint passes with usePaintLayer;
 * this host clears once and runs them in tree order.
 */
export function CanvasSurface({ children }: CanvasSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintsRef = useRef<PaintFn[]>([]);
  const scheduleRef = useRef<() => void>(() => undefined);
  const paintedRef = useRef(false);

  const registry = useMemo<PaintRegistry>(
    () => ({
      register(paint) {
        paintsRef.current.push(paint);
        scheduleRef.current();
        return () => {
          const list = paintsRef.current;
          const index = list.indexOf(paint);
          if (index >= 0) list.splice(index, 1);
          scheduleRef.current();
        };
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      paintSurface(canvas, paintsRef.current, paintedRef);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(draw);
    };
    scheduleRef.current = schedule;
    const lines = lineStore.subscribe(schedule);
    const hover = lineHoverStore.subscribe(schedule);
    const numberDrag = numberDragStore.subscribe(schedule);
    const materialGrab = materialGrabStore.subscribe(schedule);
    const view = viewportStore.subscribe(schedule);
    const preferences = preferencesStore.subscribe(schedule);
    const art = markArtStore.subscribe(schedule);
    let dragKey = markDragKey();
    const markDrag = markDragStore.subscribe(() => {
      const next = markDragKey();
      if (next === dragKey) return;
      dragKey = next;
      schedule();
    });
    schedule();
    let live = true;
    void loadBadgeFonts().then(() => {
      if (live) schedule();
    });
    return () => {
      live = false;
      scheduleRef.current = () => undefined;
      markDrag.unsubscribe();
      lines.unsubscribe();
      hover.unsubscribe();
      numberDrag.unsubscribe();
      materialGrab.unsubscribe();
      view.unsubscribe();
      preferences.unsubscribe();
      art.unsubscribe();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <PaintRegistryContext.Provider value={registry}>
      <canvas
        {...stylex.props(stage.lineCanvas)}
        ref={canvasRef}
        aria-hidden="true"
      />
      {children}
    </PaintRegistryContext.Provider>
  );
}

function paintSurface(
  canvas: HTMLCanvasElement,
  paints: readonly PaintFn[],
  paintedRef: { current: boolean },
): void {
  const view = viewportStore.get();
  const doc = lineStore.get();
  const visible =
    doc.points.length > 0 ||
    doc.layers.some((layer) => layer.anchors.length > 0);
  if (!visible && !paintedRef.current) return;
  if (view.viewWidth < 1 || view.viewHeight < 1) return;

  const dpr = window.devicePixelRatio || 1;
  const bufferW = Math.max(1, Math.round(view.viewWidth * dpr));
  const bufferH = Math.max(1, Math.round(view.viewHeight * dpr));
  if (canvas.width !== bufferW || canvas.height !== bufferH) {
    canvas.width = bufferW;
    canvas.height = bufferH;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, bufferW, bufferH);
  if (!visible) {
    paintedRef.current = false;
    dropLineGeometry(new Set());
    dropRouteSpans(new Set());
    return;
  }
  paintedRef.current = true;
  const live = new Set(doc.layers.map((layer) => layer.id));
  dropLineGeometry(live);
  dropRouteSpans(live);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const frame: PaintFrame = {
    ctx,
    doc,
    view,
    dpr,
    hover: lineHoverStore.get(),
    drag: markDragStore.get(),
    numberDrag: numberDragStore.get(),
    materialGrab: materialGrabStore.get(),
  };
  for (const paint of paints) paint(frame);
}
