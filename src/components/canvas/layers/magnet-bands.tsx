import { calloutDragStore } from "../../../state/callout-drag.ts";
import { findLayer } from "../../../state/lines.ts";
import { MARK_KIND } from "../../../state/point-marks.ts";
import { paintMaterialBand, paintNumberBand } from "../paint/bands.ts";
import { usePaintLayer, withImageSpace } from "../use-paint-layer.ts";

/** Number magnet and material landing bands under the routes. */
export function MagnetBands() {
  usePaintLayer((frame) => {
    withImageSpace(frame);
    const { ctx, doc, hover, numberDrag, drag, materialGrab } = frame;
    const aim = calloutDragStore.get();
    const magnetId =
      numberDrag?.layerId ??
      (aim?.kind === "note" ? aim.layerId : null) ??
      (hover?.type === "number" || hover?.type === "note"
        ? hover.layerId
        : null);
    if (magnetId) {
      const band = findLayer(doc, magnetId);
      if (band) paintNumberBand(ctx, band);
    }
    if (materialGrab || (drag !== null && MARK_KIND[drag.mark] === "material"))
      paintMaterialBand(ctx, doc);
  });
  return null;
}
