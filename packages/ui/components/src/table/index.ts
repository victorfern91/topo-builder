import { TableRoot } from "./table.tsx";
import { tableColumnFeatures } from "./features.ts";

/** Virtualized table. `features` types the column defs passed to `Root`. */
export const Table = {
  Root: TableRoot,
  features: tableColumnFeatures,
};

export default Table;

export { tableColumnFeatures };
export type { TableAlign, TableColumnMeta, TableFeatures } from "./features.ts";
export type { TableRootProps, TableRowProps } from "./types.ts";
