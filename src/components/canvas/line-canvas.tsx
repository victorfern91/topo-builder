import { CanvasSurface } from "./canvas-surface.tsx";
import { Badges } from "./layers/badges.tsx";
import { Controls } from "./layers/controls.tsx";
import { DropSpots } from "./layers/drop-spots.tsx";
import { MagnetBands } from "./layers/magnet-bands.tsx";
import { MarkFrame } from "./layers/mark-frame.tsx";
import { Marks } from "./layers/marks.tsx";
import { RouteStrokes } from "./layers/route-strokes.tsx";

/** Live artboard overlay: one canvas, paint passes composed as React layers. */
export function LineCanvas() {
  return (
    <CanvasSurface>
      <MagnetBands />
      <RouteStrokes />
      <Marks pass="other" />
      <DropSpots />
      <Controls />
      <MarkFrame />
      <Badges />
      <Marks pass="anchor" />
    </CanvasSurface>
  );
}
