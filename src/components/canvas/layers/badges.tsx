import { paintLineNumbers } from "../paint/badges.ts";
import { usePaintLayer, withDeviceSpace } from "../use-paint-layer.ts";

/** Route number and grade pills. */
export function Badges() {
  usePaintLayer((frame) => {
    withDeviceSpace(frame);
    const { ctx, doc, hover, view } = frame;
    paintLineNumbers(ctx, doc.layers, hover, view.zoom, view.panX, view.panY);
  });
  return null;
}
