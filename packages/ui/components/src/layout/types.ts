import type { ComponentProps, CSSProperties } from "react";
import type { Tokens } from "../tokens.stylex.ts";

type ElementProps = Omit<ComponentProps<"div">, "className" | "style">;

type LayoutStyleObject = { readonly [key: string]: unknown };

/** One StyleX object, or several composed like `stylex.props`. */
export type LayoutSx = boolean | null | LayoutStyleObject | readonly LayoutSx[];

/** DOM node. `span` keeps the layout inside phrasing content. */
export type LayoutElement = "div" | "span";

/** A `Tokens.spacing` step. */
export type LayoutSpace = keyof typeof Tokens.spacing;

/** Spacing step, or a length in pixels. */
export type LayoutGap = LayoutSpace | number;

/** `true` is 1, `false` is 0. */
export type LayoutFlex = boolean | number;

/** Pixel length, `"auto"`, or a percentage such as `"100%"`. */
export type LayoutBasis = number | "auto" | `${number}%`;

/** `true` wraps, `false` is a single line. */
export type LayoutWrap = boolean | "wrap" | "nowrap" | "wrap-reverse";

/** `align-items` and `justify-items`. */
export type LayoutAlign =
  | "stretch"
  | "center"
  | "start"
  | "end"
  | "flex-start"
  | "flex-end"
  | "baseline";

/** `justify-content` and `align-content`. */
export type LayoutJustify =
  | "start"
  | "center"
  | "end"
  | "flex-start"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "stretch";

/** `place-items`. */
export type LayoutPlace = "center" | "start" | "end" | "stretch";

export type StackDisplay = "flex" | "inline-flex";

export type StackDirection =
  "row" | "column" | "row-reverse" | "column-reverse";

export type GridDisplay = "grid" | "inline-grid";

/** Display for a box that is not a flex or grid container. */
export type BoxDisplay =
  "block" | "inline" | "inline-block" | "contents" | "none";

/** Equal track count, or a `grid-template` string such as `"auto 1fr"`. */
export type LayoutTracks = number | string;

type LayoutOwnProps = {
  /** `div` (default) or `span`. */
  renderAs?: LayoutElement;
  /**
   * Spacing between children. A step (`none` through `xxxxl`) matches
   * `Tokens.spacing`. A number is pixels.
   */
  gap?: LayoutGap;
  /** Cross-axis alignment (`align-items`). */
  align?: LayoutAlign;
  /** Main-axis distribution (`justify-content`). */
  justify?: LayoutJustify;
  /** `true` grows, `false` stays fixed. A number is `flex-grow`. */
  grow?: LayoutFlex;
  /** `true` shrinks, `false` stays fixed. A number is `flex-shrink`. */
  shrink?: LayoutFlex;
  /** `flex-basis`. A number is pixels. */
  basis?: LayoutBasis;
  /** Padding on every side. A step or a pixel length. */
  p?: LayoutGap;
  /** Horizontal padding (`padding-inline`). Overrides `p`. */
  px?: LayoutGap;
  /** Vertical padding (`padding-block`). Overrides `p`. */
  py?: LayoutGap;
  /** Margin on every side. A step or a pixel length. */
  m?: LayoutGap;
  /** Horizontal margin (`margin-inline`). Overrides `m`. */
  mx?: LayoutGap;
  /** Vertical margin (`margin-block`). Overrides `m`. */
  my?: LayoutGap;
  /** Extra StyleX styles, applied after the layout props. */
  sx?: LayoutSx;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

export type LayoutStackProps = ElementProps &
  LayoutOwnProps & {
    /** `flex` (default) or `inline-flex`. */
    display?: StackDisplay;
    /** `column` (default), `row`, `row-reverse`, or `column-reverse`. */
    direction?: StackDirection;
    /** `flex-wrap`. `true` wraps. */
    wrap?: LayoutWrap;
  };

export type LayoutGridProps = ElementProps &
  LayoutOwnProps & {
    /** `grid` (default) or `inline-grid`. */
    display?: GridDisplay;
    /** Column tracks. A number repeats equal `minmax(0, 1fr)` columns. */
    columns?: LayoutTracks;
    /** Row tracks. A number repeats equal `minmax(0, 1fr)` rows. */
    rows?: LayoutTracks;
    /** `justify-items`. */
    justifyItems?: LayoutAlign;
    /** `align-content`. */
    alignContent?: LayoutJustify;
    /** `place-items`. Sets both axes. */
    place?: LayoutPlace;
  };

export type LayoutBoxProps = ElementProps &
  Omit<LayoutOwnProps, "gap" | "align" | "justify"> & {
    /**
     * `block`, `inline`, `inline-block`, `contents`, or `none`.
     * Omitted keeps the element default (`div` is block, `span` is inline).
     */
    display?: BoxDisplay;
  };
