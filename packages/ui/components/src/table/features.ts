import { metaHelper, tableFeatures } from "@tanstack/react-table";

export type TableAlign = "start" | "center" | "end";

/** Column chrome read by `Table.Root`. */
export type TableColumnMeta = {
  /** Column width. A number is pixels. */
  width?: number | string;
  /** Cell and header alignment. Default `start`. */
  align?: TableAlign;
  /** Keeps the header for assistive tech and hides it visually. */
  headerHidden?: boolean;
};

/** Feature set for `Table.Root`. Pass it to `createColumnHelper`. */
export const tableColumnFeatures = tableFeatures({
  columnMeta: metaHelper<TableColumnMeta>(),
});

export type TableFeatures = typeof tableColumnFeatures;
