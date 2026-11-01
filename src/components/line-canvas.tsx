import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef } from "react";
import { lineHoverStore, lineStore, numberDragStore } from "../state/lines.ts";
import { paintLines } from "../state/line-paint.ts";
import { preferencesStore } from "../state/preferences.ts";
import { viewportStore } from "../state/viewport.ts";
import { stage } from "../styles/stage.ts";

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
    const view = viewportStore.subscribe(schedule);
    const preferences = preferencesStore.subscribe(schedule);
    schedule();
    return () => {
      lines.unsubscribe();
      hover.unsubscribe();
      numberDrag.unsubscribe();
      view.unsubscribe();
      preferences.unsubscribe();
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
