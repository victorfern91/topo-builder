import { useTable, type RowData } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, useState } from "react";
import { Tokens } from "../tokens.stylex.ts";
import { tableColumnFeatures } from "./features.ts";
import type { TableAlign, TableColumnMeta } from "./features.ts";
import type { TableRootProps } from "./types.ts";

/**
 * Virtualized table. `Root` is the scrollport and fills leftover space in a
 * column flex parent. Build columns with `createColumnHelper<TableFeatures, Row>()`.
 *
 * @example
 * ```tsx
 * import { createColumnHelper } from '@tanstack/react-table'
 * import { Table, type TableFeatures } from '@ui'
 *
 * const columnHelper = createColumnHelper<TableFeatures, Row>()
 * const columns = columnHelper.columns([
 *   columnHelper.accessor('name', {
 *     header: 'Name',
 *     cell: (info) => info.getValue(),
 *   }),
 * ])
 *
 * <Table.Root
 *   data={rows}
 *   columns={columns}
 *   getRowId={(row) => row.id}
 *   aria-label="Rows"
 * />
 * ```
 */
export function TableRoot<T extends RowData>({
  data,
  columns,
  getRowId,
  getRowProps,
  estimateSize = 32,
  overscan = 8,
  scrollToId = null,
  sx,
  className,
  style,
  "aria-label": ariaLabel,
}: TableRootProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const scrolledId = useRef<string | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const table = useTable({
    features: tableColumnFeatures,
    data,
    columns,
    getRowId,
  });
  const rows = table.getRowModel().rows;
  // TanStack Virtual returns a virtualizer React Compiler will not memoize.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
    scrollMargin,
  });
  const items = virtualizer.getVirtualItems();
  const columnCount = table.getHeaderGroups()[0]?.headers.length ?? 1;
  const paddingTop =
    items.length > 0 ? Math.max(0, items[0].start - scrollMargin) : 0;
  const paddingBottom =
    items.length > 0
      ? Math.max(
          0,
          virtualizer.getTotalSize() -
            (items[items.length - 1].end - scrollMargin),
        )
      : 0;

  useLayoutEffect(() => {
    setScrollMargin(headerRef.current?.offsetHeight ?? 0);
  }, [rows.length, columnCount]);

  useLayoutEffect(() => {
    if (scrollToId == null) {
      scrolledId.current = null;
      return;
    }
    const key = `${scrollToId}:${scrollMargin}`;
    if (scrolledId.current === key) return;
    const index = rows.findIndex((row) => row.id === scrollToId);
    if (index < 0) return;
    scrolledId.current = key;
    virtualizer.scrollToIndex(index, { align: "auto" });
  }, [scrollToId, scrollMargin, rows, virtualizer]);

  const styled = stylex.props(styles.scroll, sx);
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return (
    <div
      {...styled}
      ref={scrollRef}
      className={mergedClass || undefined}
      style={{ ...styled.style, ...style }}
    >
      <table {...stylex.props(styles.table)} aria-label={ariaLabel}>
        <colgroup>
          {table.getHeaderGroups()[0]?.headers.map((header) => (
            <col
              key={header.id}
              style={columnWidth(header.column.columnDef.meta?.width)}
            />
          ))}
        </colgroup>
        <thead ref={headerRef}>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const label = <table.FlexRender header={header} />;
                return (
                  <th
                    key={header.id}
                    scope="col"
                    {...stylex.props(styles.head, alignStyle(meta?.align))}
                  >
                    {meta?.headerHidden ? (
                      <span {...stylex.props(styles.hidden)}>{label}</span>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          <Spacer height={paddingTop} span={columnCount} />
          {items.map((item) => {
            const row = rows[item.index];
            if (!row) return null;
            const rowProps = getRowProps?.(row.original, row.index);
            return (
              <tr
                key={row.id}
                data-index={item.index}
                data-selected={rowProps?.selected ? "" : undefined}
                data-locked={rowProps?.locked ? "" : undefined}
                ref={virtualizer.measureElement}
                onPointerDown={rowProps?.onPointerDown}
                {...stylex.props(styles.row)}
              >
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    {...stylex.props(
                      styles.cell,
                      alignStyle(cell.column.columnDef.meta?.align),
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            );
          })}
          <Spacer height={paddingBottom} span={columnCount} />
        </tbody>
      </table>
    </div>
  );
}

function Spacer({ height, span }: { height: number; span: number }) {
  if (height <= 0) return null;
  return (
    <tr aria-hidden="true">
      <td colSpan={span} style={{ height, padding: 0, border: 0 }} />
    </tr>
  );
}

function alignStyle(align: TableAlign | undefined) {
  if (align === "center") return styles.alignCenter;
  if (align === "end") return styles.alignEnd;
  return undefined;
}

function columnWidth(
  width: TableColumnMeta["width"],
): { width: number | string } | undefined {
  if (width == null) return undefined;
  return { width };
}

const styles = stylex.create({
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
    overscrollBehavior: "contain",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
    lineHeight: 1.3,
  },
  head: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: Tokens.color.neutral[750],
    paddingTop: Tokens.spacing.sm,
    paddingRight: Tokens.spacing.xs,
    paddingBottom: Tokens.spacing.xs,
    paddingLeft: Tokens.spacing.xs,
    color: Tokens.color.neutral[400],
    fontSize: 11,
    fontWeight: 650,
    textAlign: "start",
  },
  cell: {
    paddingTop: Tokens.spacing.xxs,
    paddingRight: Tokens.spacing.xs,
    paddingBottom: Tokens.spacing.xxs,
    paddingLeft: Tokens.spacing.xs,
    verticalAlign: "middle",
    textAlign: "start",
    backgroundColor: {
      default: "transparent",
      "[data-drop]": Tokens.color.blue[35],
    },
  },
  alignCenter: {
    textAlign: "center",
  },
  alignEnd: {
    textAlign: "end",
  },
  row: {
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[4],
      "[data-selected]": Tokens.color.blue[28],
    },
    color: {
      default: "inherit",
      "[data-locked]": Tokens.color.neutral[400],
    },
  },
  hidden: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
