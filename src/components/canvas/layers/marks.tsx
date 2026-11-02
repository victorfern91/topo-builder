import { markedId, paintMarks } from "../paint/marks.ts";
import { usePaintLayer, withImageSpace } from "../use-paint-layer.ts";

type MarksProps = {
  /** Anchors paint last so nothing covers them. */
  pass: "anchor" | "other";
};

/** Point marks. Split into two passes for z-order. */
export function Marks({ pass }: MarksProps) {
  usePaintLayer((frame) => {
    withImageSpace(frame);
    const { ctx, doc, hover, view, dpr } = frame;
    const selectedId =
      doc.markId ?? markedId(doc, doc.activeId, doc.anchorIndex);
    const hoveredId =
      hover?.type === "mark"
        ? hover.pointId
        : hover?.type === "anchor"
          ? markedId(doc, hover.layerId, hover.index)
          : null;
    paintMarks(
      ctx,
      doc,
      selectedId,
      hoveredId,
      view.zoom,
      dpr * view.zoom,
      pass === "anchor",
    );
  });
  return null;
}
