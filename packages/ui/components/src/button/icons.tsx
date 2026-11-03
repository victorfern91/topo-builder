import * as stylex from "@stylexjs/stylex";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbArrowLeft,
  TbArrowRight,
  TbArrowsMove,
  TbBlob,
  TbChevronDown,
  TbChevronUp,
  TbCopy,
  TbLock,
  TbLockOpen,
  TbMaximize,
  TbMinus,
  TbPointer,
  TbRoute2,
  TbRuler2,
  TbTrash,
  TbWindowMaximize,
  TbX,
  TbZoomIn,
  TbZoomOut,
} from "react-icons/tb";

// Named imports from `react-icons/tb`. The package is side-effect free, so
// the bundler drops every Tabler icon that is not in this map.
const glyphs = {
  undo: TbArrowBackUp,
  redo: TbArrowForwardUp,
  "arrow-left": TbArrowLeft,
  "arrow-right": TbArrowRight,
  move: TbArrowsMove,
  route: TbRoute2,
  boulder: TbBlob,
  edit: TbPointer,
  "zoom-in": TbZoomIn,
  "zoom-out": TbZoomOut,
  fit: TbMaximize,
  scale: TbRuler2,
  lock: TbLock,
  unlock: TbLockOpen,
  copy: TbCopy,
  trash: TbTrash,
  "chevron-up": TbChevronUp,
  "chevron-down": TbChevronDown,
  close: TbX,
  minimize: TbMinus,
  restore: TbWindowMaximize,
};

export function ButtonGlyph({ id }: { id: string }) {
  if (!isGlyph(id)) return null;
  const Glyph = glyphs[id];
  return <Glyph {...iconProps} />;
}

function isGlyph(id: string): id is keyof typeof glyphs {
  return Object.hasOwn(glyphs, id);
}

const styles = stylex.create({
  icon: {
    width: 20,
    height: 20,
    display: "block",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
});

const iconProps = {
  ...stylex.props(styles.icon),
  "aria-hidden": true as const,
};
