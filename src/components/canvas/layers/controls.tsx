import { findLayer } from "../../../state/lines.ts";
import { paintControls } from "../paint/controls.ts";
import { usePaintLayer, withDeviceSpace } from "../use-paint-layer.ts";

/** Active-route anchor squares and hovered plain anchors. */
export function Controls() {
  usePaintLayer((frame) => {
    withDeviceSpace(frame);
    const { ctx, doc, hover, view } = frame;
    const active = findLayer(doc, doc.activeId);
    paintControls(ctx, doc, active, hover, view.zoom, view.panX, view.panY);
  });
  return null;
}
