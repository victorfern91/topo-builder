import { LayoutBox, LayoutGrid, LayoutStack } from "./layout.tsx";

/** Flex, grid, and plain boxes. `renderAs` is `div` or `span` on each part. */
export const Layout = {
  Box: LayoutBox,
  Stack: LayoutStack,
  Grid: LayoutGrid,
};

export default Layout;

export type {
  BoxDisplay,
  GridDisplay,
  LayoutAlign,
  LayoutBasis,
  LayoutBoxProps,
  LayoutElement,
  LayoutFlex,
  LayoutGap,
  LayoutGridProps,
  LayoutJustify,
  LayoutPlace,
  LayoutSpace,
  LayoutStackProps,
  LayoutTracks,
  LayoutWrap,
  StackDirection,
  StackDisplay,
} from "./types.ts";
