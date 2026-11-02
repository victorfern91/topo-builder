import { findLayer } from "../../../state/lines.ts";
import { MARK_KIND } from "../../../state/point-marks.ts";
import { paintMaterialBand, paintNumberBand } from "../paint/bands.ts";
import { usePaintLayer, withImageSpace } from "../use-paint-layer.ts";

/** Number magnet and material landing bands under the routes. */
export function MagnetBands() {
  usePaintLayer((frame) => {
    withImageSpace(frame);
    const { ctx, doc, hover, numberDrag, drag, materialGrab } = frame;
    const magnetId =
      numberDrag?.layerId ?? (hover?.type === "number" ? hover.layerId : null);
    if (magnetId) {
      const band = findLayer(doc, magnetId);
      if (band) paintNumberBand(ctx, band);
    }
    if (materialGrab || (drag !== null && MARK_KIND[drag.mark] === "material"))
      paintMaterialBand(ctx, doc);
  });
  return null;
}
