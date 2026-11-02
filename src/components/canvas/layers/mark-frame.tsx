import { paintMarkFrame } from "../paint/marks.ts";
import { usePaintLayer, withDeviceSpace } from "../use-paint-layer.ts";

/** Resize frame around the selected free characteristic. */
export function MarkFrame() {
  usePaintLayer((frame) => {
    withDeviceSpace(frame);
    const { ctx, doc, hover, view } = frame;
    paintMarkFrame(ctx, doc, hover, view.zoom, view.panX, view.panY);
  });
  return null;
}
