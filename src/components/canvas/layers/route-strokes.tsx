import { paintRouteStrokes } from "../paint/routes.ts";
import { usePaintLayer, withImageSpace } from "../use-paint-layer.ts";

/** Selection halo and every route stroke. */
export function RouteStrokes() {
  usePaintLayer((frame) => {
    withImageSpace(frame);
    paintRouteStrokes(frame.ctx, frame.doc.layers, frame.doc.activeId);
  });
  return null;
}
