import { isFreeMark } from "../../../state/point-marks.ts";
import { paintDropSpots } from "../paint/marks.ts";
import { usePaintLayer, withDeviceSpace } from "../use-paint-layer.ts";

/** Valid landing rings while dragging a route mark from the palette. */
export function DropSpots() {
  usePaintLayer((frame) => {
    const { ctx, doc, drag, view } = frame;
    if (!drag || isFreeMark(drag.mark)) return;
    withDeviceSpace(frame);
    paintDropSpots(
      ctx,
      doc,
      drag.mark,
      drag.landing,
      view.zoom,
      view.panX,
      view.panY,
    );
  });
  return null;
}
