import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentProps, CSSProperties, ReactNode, Ref } from "react";
import type { LayoutBoxProps, LayoutStackProps } from "../layout/types.ts";

/** DOM node for a floating panel. */
export type WidgetSurface = "div" | "aside" | "section";

export type WidgetPanelProps = Omit<
  ComponentProps<"div">,
  | "className"
  | "style"
  | "ref"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDrop"
> & {
  /** `div` (default), `aside`, or `section`. */
  renderAs?: WidgetSurface;
  ref?: Ref<HTMLElement | null>;
  /** Horizontal offset in pixels. */
  x: number;
  /** Vertical offset in pixels. */
  y: number;
  /** Hidden until the stage has a size. Default true. */
  placed?: boolean;
  /** Sets `data-dragging` on the panel and the header. */
  dragging?: boolean;
  /**
   * Reports the border box after layout and while the user resizes.
   * Width and height are pixels.
   */
  onResize?: (width: number, height: number) => void;
  /**
   * Right edge, bottom edge, and corner resize the panel.
   * Default false; the panel stays at its layout size.
   */
  resizable?: boolean;
  /** Minimum width while resizing, in pixels. Default 48. */
  minWidth?: number;
  /** Minimum height while resizing, in pixels. Default 48. */
  minHeight?: number;
  /** Accessible name for the corner resize handle. */
  resizeLabel?: string;
  /** Called once, when a pointer drag passes the movement threshold. */
  onDragStart?: () => void;
  /** Pointer drag and arrow-key nudge. Coordinates are the next origin. */
  onMove: (x: number, y: number) => void;
  /** Pointer released. `moved` is false for a click on the header. */
  onDragEnd?: (moved: boolean) => void;
  /** Extra StyleX styles, applied after the panel chrome. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
  children?: ReactNode;
};

export type WidgetHeaderProps = {
  /** Accessible name for the drag handle. */
  label: string;
  /**
   * Title shown beside the grip.
   * Omit it for a compact grip bar.
   */
  children?: ReactNode;
  sx?: StyleXStyles;
};

export type WidgetContainerProps = LayoutStackProps;

export type WidgetMenuProps = LayoutBoxProps & {
  /**
   * Right edge, bottom edge, and corner resize the menu.
   * Default false; the menu stays at its content size.
   */
  resizable?: boolean;
  /**
   * Reports the border box after layout and while the user resizes.
   * Width and height are pixels. Used when `resizable` is set.
   */
  onResize?: (width: number, height: number) => void;
  /** Minimum width while resizing, in pixels. Default 48. */
  minWidth?: number;
  /** Minimum height while resizing, in pixels. Default 48. */
  minHeight?: number;
  /** Accessible name for the corner resize handle. */
  resizeLabel?: string;
};
