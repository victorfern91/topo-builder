import * as stylex from "@stylexjs/stylex";
import { createElement, type ComponentProps, type CSSProperties } from "react";
import { Tokens } from "../tokens.stylex.ts";
import type {
  BoxDisplay,
  LayoutAlign,
  LayoutBasis,
  LayoutBoxProps,
  LayoutElement,
  LayoutFlex,
  LayoutGap,
  LayoutGridProps,
  LayoutJustify,
  LayoutPlace,
  LayoutSx,
  LayoutStackProps,
  LayoutTracks,
  LayoutWrap,
  StackDirection,
} from "./types.ts";

/**
 * Plain `div` or `span`. Use for flex children and other boxes that are
 * not themselves flex or grid containers.
 *
 * @example
 * ```tsx
 * import { Layout } from '@ui'
 *
 * <Layout.Box renderAs="span" grow shrink={false} px="sm">
 *   Label
 * </Layout.Box>
 * ```
 */
export function LayoutBox({
  renderAs = "div",
  display,
  grow,
  shrink,
  basis,
  p,
  px,
  py,
  m,
  mx,
  my,
  sx,
  className,
  style,
  ...props
}: LayoutBoxProps) {
  return (
    <LayoutNode
      renderAs={renderAs}
      styled={styledLayout({
        boxDisplay: display,
        grow,
        shrink,
        basis,
        p,
        px,
        py,
        m,
        mx,
        my,
        sx,
      })}
      className={className}
      style={style}
      {...props}
    />
  );
}

/**
 * Column flex container. `renderAs` is `div` (default) or `span`.
 * Remaining props are passed to that element
 * (`id`, `onClick`, `role`, `aria-*`, `ref`).
 *
 * @example
 * ```tsx
 * import { Layout } from '@ui'
 *
 * <Layout.Stack
 *   renderAs="span"
 *   direction="row"
 *   gap="md"
 *   align="center"
 *   justify="space-between"
 *   wrap
 *   px="md"
 * >
 *   <span>Name</span>
 *   <span>Value</span>
 * </Layout.Stack>
 * ```
 */
export function LayoutStack({
  renderAs = "div",
  display = "flex",
  direction = "column",
  wrap,
  gap,
  align,
  justify,
  grow,
  shrink,
  basis,
  p,
  px,
  py,
  m,
  mx,
  my,
  sx,
  className,
  style,
  ...props
}: LayoutStackProps) {
  return (
    <LayoutNode
      renderAs={renderAs}
      styled={styledLayout({
        stack: true,
        display,
        direction,
        wrap,
        gap,
        align,
        justify,
        grow,
        shrink,
        basis,
        p,
        px,
        py,
        m,
        mx,
        my,
        sx,
      })}
      className={className}
      style={style}
      {...props}
    />
  );
}

/**
 * Grid container. `columns` and `rows` set the templates.
 * `renderAs`, `align`, `justify`, `gap`, and `sx` match `Layout.Stack`.
 *
 * @example
 * ```tsx
 * import { Layout } from '@ui'
 *
 * <Layout.Grid columns={3} gap="lg" align="center" place="center">
 *   {items}
 * </Layout.Grid>
 * ```
 */
export function LayoutGrid({
  renderAs = "div",
  display = "grid",
  columns,
  rows,
  gap,
  align,
  justify,
  justifyItems,
  alignContent,
  place,
  grow,
  shrink,
  basis,
  p,
  px,
  py,
  m,
  mx,
  my,
  sx,
  className,
  style,
  ...props
}: LayoutGridProps) {
  return (
    <LayoutNode
      renderAs={renderAs}
      styled={styledLayout({
        grid: true,
        display,
        columns,
        rows,
        gap,
        align,
        justify,
        justifyItems,
        alignContent,
        place,
        grow,
        shrink,
        basis,
        p,
        px,
        py,
        m,
        mx,
        my,
        sx,
      })}
      className={className}
      style={style}
      {...props}
    />
  );
}

function LayoutNode({
  renderAs,
  styled,
  className,
  style,
  ...props
}: {
  renderAs: LayoutElement;
  styled: ReturnType<typeof stylex.props>;
  className?: string;
  style?: CSSProperties;
} & Omit<ComponentProps<"div">, "className" | "style">) {
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return createElement(renderAs, {
    ...props,
    ...styled,
    className: mergedClass || undefined,
    style: { ...styled.style, ...style },
  });
}

type StyledInput = {
  stack?: boolean;
  grid?: boolean;
  display?: string;
  boxDisplay?: BoxDisplay;
  direction?: StackDirection;
  wrap?: LayoutWrap;
  columns?: LayoutTracks;
  rows?: LayoutTracks;
  gap?: LayoutGap;
  align?: LayoutAlign;
  justify?: LayoutJustify;
  justifyItems?: LayoutAlign;
  alignContent?: LayoutJustify;
  place?: LayoutPlace;
  grow?: LayoutFlex;
  shrink?: LayoutFlex;
  basis?: LayoutBasis;
  p?: LayoutGap;
  px?: LayoutGap;
  py?: LayoutGap;
  m?: LayoutGap;
  mx?: LayoutGap;
  my?: LayoutGap;
  sx?: LayoutSx;
};

function styledLayout({
  stack,
  grid,
  display,
  boxDisplay,
  direction,
  wrap,
  columns,
  rows,
  gap,
  align,
  justify,
  justifyItems,
  alignContent,
  place,
  grow,
  shrink,
  basis,
  p,
  px,
  py,
  m,
  mx,
  my,
  sx,
}: StyledInput) {
  return stylex.props(
    stack && styles.stack,
    stack && display === "inline-flex" && styles.inlineFlex,
    grid && styles.grid,
    grid && display === "inline-grid" && styles.inlineGrid,
    boxDisplay === "block" && styles.block,
    boxDisplay === "inline" && styles.inline,
    boxDisplay === "inline-block" && styles.inlineBlock,
    boxDisplay === "contents" && styles.contents,
    boxDisplay === "none" && styles.displayNone,
    direction === "row" && styles.row,
    direction === "row-reverse" && styles.rowReverse,
    direction === "column-reverse" && styles.columnReverse,
    (wrap === true || wrap === "wrap") && styles.wrap,
    (wrap === false || wrap === "nowrap") && styles.nowrap,
    wrap === "wrap-reverse" && styles.wrapReverse,
    columns != null && styles.columns(trackTemplate(columns)),
    rows != null && styles.rows(trackTemplate(rows)),
    gap != null && styles.gap(space(gap)),
    align != null && styles.align(align),
    justify != null && styles.justify(justify),
    justifyItems != null && styles.justifyItems(justifyItems),
    alignContent != null && styles.alignContent(alignContent),
    place != null && styles.place(place),
    grow != null && styles.grow(flexFactor(grow)),
    shrink != null && styles.shrink(flexFactor(shrink)),
    basis != null && styles.basis(basis),
    p != null && styles.padding(space(p)),
    px != null && styles.paddingInline(space(px)),
    py != null && styles.paddingBlock(space(py)),
    m != null && styles.margin(space(m)),
    mx != null && styles.marginInline(space(mx)),
    my != null && styles.marginBlock(space(my)),
    sx as never,
  );
}

function space(value: LayoutGap): number {
  return typeof value === "number" ? value : Tokens.spacing[value];
}

function flexFactor(value: LayoutFlex): number {
  return typeof value === "number" ? value : value ? 1 : 0;
}

function trackTemplate(tracks: LayoutTracks): string {
  return typeof tracks === "number"
    ? `repeat(${tracks}, minmax(0, 1fr))`
    : tracks;
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
  },
  inlineFlex: {
    display: "inline-flex",
  },
  row: {
    flexDirection: "row",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  columnReverse: {
    flexDirection: "column-reverse",
  },
  wrap: {
    flexWrap: "wrap",
  },
  nowrap: {
    flexWrap: "nowrap",
  },
  wrapReverse: {
    flexWrap: "wrap-reverse",
  },
  grid: {
    display: "grid",
  },
  inlineGrid: {
    display: "inline-grid",
  },
  block: {
    display: "block",
  },
  inline: {
    display: "inline",
  },
  inlineBlock: {
    display: "inline-block",
  },
  contents: {
    display: "contents",
  },
  displayNone: {
    display: "none",
  },
  gap: (gap: number) => ({
    gap,
  }),
  align: (align: LayoutAlign) => ({
    alignItems: align,
  }),
  justify: (justify: LayoutJustify) => ({
    justifyContent: justify,
  }),
  justifyItems: (justifyItems: LayoutAlign) => ({
    justifyItems,
  }),
  alignContent: (alignContent: LayoutJustify) => ({
    alignContent,
  }),
  place: (place: LayoutPlace) => ({
    placeItems: place,
  }),
  grow: (grow: number) => ({
    flexGrow: grow,
  }),
  shrink: (shrink: number) => ({
    flexShrink: shrink,
  }),
  basis: (basis: LayoutBasis) => ({
    flexBasis: basis,
  }),
  padding: (padding: number) => ({
    padding,
  }),
  paddingInline: (paddingInline: number) => ({
    paddingInline,
  }),
  paddingBlock: (paddingBlock: number) => ({
    paddingBlock,
  }),
  margin: (margin: number) => ({
    margin,
  }),
  marginInline: (marginInline: number) => ({
    marginInline,
  }),
  marginBlock: (marginBlock: number) => ({
    marginBlock,
  }),
  columns: (columns: string) => ({
    gridTemplateColumns: columns,
  }),
  rows: (rows: string) => ({
    gridTemplateRows: rows,
  }),
});
