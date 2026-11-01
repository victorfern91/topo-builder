import type { ColumnDef, RowData } from "@tanstack/react-table";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { TableFeatures } from "./features.ts";

export type TableRowProps = {
  /** Sets `data-selected` on the row. */
  selected?: boolean;
  /** Sets `data-locked` on the row. */
  locked?: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLTableRowElement>) => void;
};

export type TableRootProps<T extends RowData> = {
  data: T[];
  /** Column defs from `createColumnHelper<TableFeatures, T>()`. */
  columns: ColumnDef<TableFeatures, T>[];
  /** Stable id for virtualization and `scrollToId`. */
  getRowId: (row: T, index: number) => string;
  /** Selection, lock, and pointer handling for each row. */
  getRowProps?: (row: T, index: number) => TableRowProps;
  /** Estimated row height in pixels. Default 32. */
  estimateSize?: number;
  /** Extra rows rendered above and below the viewport. Default 8. */
  overscan?: number;
  /** Scrolls this row into view when the id changes. */
  scrollToId?: string | null;
  /** Extra styles for the scrollport. */
  sx?: StyleXStyles;
  className?: string;
  style?: CSSProperties;
  "aria-label": string;
};
