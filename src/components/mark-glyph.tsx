import * as stylex from "@stylexjs/stylex";
import { markArtUrl, type PointMark } from "../state/point-marks.ts";

/** The point mark from its source SVG, `size` CSS pixels square. */
export function MarkGlyph({ mark, size }: { mark: PointMark; size: number }) {
  return (
    <img
      {...stylex.props(styles.glyph)}
      src={markArtUrl(mark)}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

const styles = stylex.create({
  glyph: {
    display: "block",
    pointerEvents: "none",
  },
});
