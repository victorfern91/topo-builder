import { paintCallouts } from "../paint/callouts.ts";
import { usePaintLayer, withImageSpace } from "../use-paint-layer.ts";

/** Route notes, free text, and exit arrows. */
export function Callouts() {
  usePaintLayer((frame) => {
    withImageSpace(frame);
    paintCallouts(frame.ctx, frame.doc, frame.hover, frame.view.zoom, true);
  });
  return null;
}
