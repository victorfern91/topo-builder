import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef } from "react";
import {
  lineHoverStore,
  lineStore,
  materialGrabStore,
  numberDragStore,
} from "../state/lines.ts";
import { paintLines } from "../state/line-paint.ts";
import { markDragStore } from "../state/mark-drag.ts";
import { markArtStore } from "../state/point-marks.ts";
import { preferencesStore } from "../state/preferences.ts";
import { viewportStore } from "../state/viewport.ts";
import { stage } from "../styles/stage.ts";

/** The parts of a palette drag the canvas paints. Ghost moves alone skip a repaint. */
function markDragKey(): string {
  const drag = markDragStore.get();
  if (!drag) return "";
  const at = drag.landing;
  return at ? `${drag.mark}:${at.x}:${at.y}` : drag.mark;
}

export function LineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      paintLines(canvas);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(draw);
    };
    const lines = lineStore.subscribe(schedule);
    const hover = lineHoverStore.subscribe(schedule);
    const numberDrag = numberDragStore.subscribe(schedule);
    const materialGrab = materialGrabStore.subscribe(schedule);
    const view = viewportStore.subscribe(schedule);
    const preferences = preferencesStore.subscribe(schedule);
    const art = markArtStore.subscribe(schedule);
    let painted = markDragKey();
    const markDrag = markDragStore.subscribe(() => {
      const next = markDragKey();
      if (next === painted) return;
      painted = next;
      schedule();
    });
    schedule();
    return () => {
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
    <canvas
      {...stylex.props(stage.lineCanvas)}
      ref={canvasRef}
      aria-hidden="true"
    />
  );
}
