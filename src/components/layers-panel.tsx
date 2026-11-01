import * as stylex from "@stylexjs/stylex";
import { createColumnHelper } from "@tanstack/react-table";
import { Button, Input, Layout, Table, Widget, type TableFeatures } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { t } from "../i18n/index.ts";
import {
  LINE_COLORS,
  copyLine,
  deleteLine,
  lineStore,
  moveLine,
  renameLine,
  selectLine,
  setLineColor,
  toggleLineLock,
  type LineLayer,
} from "../state/lines.ts";
import { useWidgetFrame } from "../state/use-viewport.ts";
import { lineLayers } from "../styles/stage.ts";

const layerColumn = createColumnHelper<TableFeatures, LineLayer>();

/** Store order. `row.index` is the line number, and the same number is drawn on the photo. */
const layerColumns = layerColumn.columns([
  layerColumn.display({
    id: "order",
    header: () => t("layerOrder"),
    meta: { width: 80, align: "end" },
    cell: ({ row, table }) => (
      <LayerOrder
        layer={row.original}
        index={row.index}
        count={table.options.data.length}
      />
    ),
  }),
  layerColumn.display({
    id: "color",
    header: () => t("layerColor"),
    meta: { width: 28, align: "center", headerHidden: true },
    cell: ({ row }) => (
      <Layout.Box
        renderAs="span"
        display="inline-block"
        sx={lineLayers.swatch}
        style={{ backgroundColor: row.original.color }}
      />
    ),
  }),
  layerColumn.display({
    id: "name",
    header: () => t("layerName"),
    cell: ({ row }) => <LayerName layer={row.original} />,
  }),
  layerColumn.display({
    id: "kind",
    header: () => t("layerKind"),
    meta: { width: 72, align: "end" },
    cell: ({ row }) => (
      <span {...stylex.props(lineLayers.kind)}>
        {t(row.original.kind === "route" ? "routeKind" : "boulderKind")}
      </span>
    ),
  }),
  layerColumn.display({
    id: "actions",
    header: () => t("layerActions"),
    meta: { width: 88, align: "end", headerHidden: true },
    cell: ({ row }) => <LayerActions layer={row.original} />,
  }),
]);

export function LayersPanel() {
  const frame = useWidgetFrame("layers");
  const visible = useSelector(lineStore, (state) => state.layers.length > 0);
  if (!visible) return null;

  return (
    <Widget.Panel
      {...frame}
      renderAs="section"
      resizable
      minWidth={320}
      minHeight={120}
      resizeLabel={t("resizePanel")}
      sx={lineLayers.root}
      data-layers=""
      aria-label={t("layers")}
    >
      <Widget.Header label={t("dragLayers")}>{t("layers")}</Widget.Header>
      <LayerColors />
      <LayerTable />
    </Widget.Panel>
  );
}

function LayerTable() {
  const layers = useSelector(lineStore, (state) => state.layers);
  const activeId = useSelector(lineStore, (state) => state.activeId);
  const focusId = useSelector(lineStore, (state) => {
    const active = state.layers.find((item) => item.id === state.activeId);
    if (!active || active.anchors.length > 0) return null;
    return active.id;
  });

  useLayoutEffect(() => {
    if (!focusId) return;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused.closest("[data-layers]"))
      return;
    let frameId = 0;
    const tryFocus = (left: number) => {
      const input = document.getElementById(layerNameId(focusId));
      if (input instanceof HTMLInputElement) {
        input.focus();
        return;
      }
      if (left <= 0) return;
      frameId = requestAnimationFrame(() => tryFocus(left - 1));
    };
    tryFocus(6);
    return () => cancelAnimationFrame(frameId);
  }, [focusId]);

  return (
    <Table.Root
      data={layers}
      columns={layerColumns}
      getRowId={layerRowId}
      getRowProps={(layer) => ({
        selected: layer.id === activeId,
        locked: layer.locked,
        onPointerDown: () => selectLine(layer.id),
      })}
      estimateSize={28}
      scrollToId={activeId}
      aria-label={t("layers")}
    />
  );
}

function LayerColors() {
  const layer = useSelector(
    lineStore,
    (state) => {
      const active = state.layers.find((item) => item.id === state.activeId);
      if (!active) return null;
      return { id: active.id, color: active.color, locked: active.locked };
    },
    { compare: shallow },
  );
  if (!layer) return null;
  return <ColorSteps layer={layer} />;
}

function ColorSteps({
  layer,
}: {
  layer: { id: string; color: string; locked: boolean };
}) {
  return (
    <Layout.Stack
      direction="row"
      wrap
      grow={false}
      shrink={false}
      gap="sm"
      py="md"
      px="lg"
      role="group"
      aria-label={t("lineColors")}
      sx={lineLayers.colors}
    >
      {LINE_COLORS.map((value) => {
        const selected = layer.color === value;
        return (
          <Button.Root
            key={value}
            sx={lineLayers.colorStep}
            type="button"
            disabled={layer.locked}
            aria-label={t("lineColorValue", { color: value })}
            aria-pressed={selected}
            data-selected={selected ? "" : undefined}
            title={value}
            style={{ backgroundColor: value }}
            onClick={() => setLineColor(layer.id, value)}
          />
        );
      })}
    </Layout.Stack>
  );
}

const DRAG_SLOP = 3;

type OrderDrag = {
  pointerId: number;
  id: string;
  from: number;
  to: number;
  startY: number;
  moved: boolean;
  over: boolean;
  done: boolean;
};

function LayerOrder({
  layer,
  index,
  count,
}: {
  layer: LineLayer;
  index: number;
  count: number;
}) {
  const drag = useRef<OrderDrag | null>(null);
  const upLabel = t("moveLayerUp");
  const downLabel = t("moveLayerDown");
  const reorderLabel = t("reorderLayer", { order: String(index + 1) });
  const reorderHint = t("reorderLayerHint");

  useEffect(() => {
    return () => {
      drag.current = null;
      const root = document.querySelector("[data-layers]");
      if (root) setDropRow(root, null);
    };
  }, []);

  const finishDrag = (commit: boolean) => {
    const current = drag.current;
    if (!current || current.done) return;
    current.done = true;
    const root = document.querySelector("[data-layers]");
    if (root) setDropRow(root, null);
    if (
      commit &&
      current.moved &&
      current.over &&
      current.to !== current.from
    ) {
      moveLine(current.id, current.to);
    }
  };

  const onReorderKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveLine(layer.id, index - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveLine(layer.id, index + 1);
    }
  };

  const onReorderPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    selectLine(layer.id);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      id: layer.id,
      from: index,
      to: index,
      startY: event.clientY,
      moved: false,
      over: false,
      done: false,
    };
  };

  const onReorderPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const current = drag.current;
    if (!current || current.done || current.pointerId !== event.pointerId)
      return;
    if (!current.moved && Math.abs(event.clientY - current.startY) < DRAG_SLOP)
      return;
    current.moved = true;
    const root = event.currentTarget.closest("[data-layers]");
    if (!root) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const row = hit instanceof Element ? hit.closest("tr[data-index]") : null;
    const raw = row?.getAttribute("data-index");
    const next = raw == null ? Number.NaN : Number(raw);
    if (!Number.isInteger(next)) {
      current.over = false;
      setDropRow(root, null);
      return;
    }
    current.over = true;
    current.to = next;
    setDropRow(root, next);
  };

  const onReorderPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag(true);
  };

  return (
    <Layout.Stack
      direction="row"
      align="center"
      justify="end"
      gap="xxs"
      grow={false}
      shrink={false}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Button.Root
        type="button"
        size="sm"
        sx={lineLayers.action}
        aria-label={upLabel}
        title={upLabel}
        disabled={index === 0}
        onClick={() => {
          selectLine(layer.id);
          moveLine(layer.id, index - 1);
        }}
      >
        <Button.Icon id="chevron-up" />
      </Button.Root>
      <Button.Root
        type="button"
        size="sm"
        sx={lineLayers.orderHandle}
        aria-label={reorderLabel}
        title={reorderHint}
        aria-keyshortcuts="ArrowUp ArrowDown"
        onKeyDown={onReorderKeyDown}
        onPointerDown={onReorderPointerDown}
        onPointerMove={onReorderPointerMove}
        onPointerUp={onReorderPointerUp}
        onPointerCancel={() => finishDrag(false)}
        onLostPointerCapture={() => {
          if (!drag.current?.moved) return;
          finishDrag(true);
        }}
      >
        <Button.Text>{index + 1}</Button.Text>
      </Button.Root>
      <Button.Root
        type="button"
        size="sm"
        sx={lineLayers.action}
        aria-label={downLabel}
        title={downLabel}
        disabled={index >= count - 1}
        onClick={() => {
          selectLine(layer.id);
          moveLine(layer.id, index + 1);
        }}
      >
        <Button.Icon id="chevron-down" />
      </Button.Root>
    </Layout.Stack>
  );
}

function setDropRow(root: Element, index: number | null): void {
  for (const row of root.querySelectorAll("tr[data-index]")) {
    const match =
      index !== null && row.getAttribute("data-index") === String(index);
    if (match) row.setAttribute("data-drop", "");
    else row.removeAttribute("data-drop");
    for (const cell of row.children) {
      if (!(cell instanceof HTMLElement)) continue;
      if (match) cell.setAttribute("data-drop", "");
      else cell.removeAttribute("data-drop");
    }
  }
}

function layerNameId(id: string): string {
  return `layer-name-${id}`;
}

function layerRowId(layer: LineLayer): string {
  return layer.id;
}

function LayerName({ layer }: { layer: LineLayer }) {
  return (
    <Input.Root
      sx={lineLayers.name}
      id={layerNameId(layer.id)}
      aria-label={t("layerName")}
      value={layer.name}
      disabled={layer.locked}
      spellCheck={false}
      autoComplete="off"
      onValueChange={(value) => renameLine(layer.id, value)}
      onFocus={() => selectLine(layer.id)}
    />
  );
}

function LayerActions({ layer }: { layer: LineLayer }) {
  const lockLabel = t(layer.locked ? "unlockLayer" : "lockLayer");
  const copyLabel = t("copyLayer");
  const deleteLabel = t("deleteLayer");
  return (
    <Layout.Stack
      direction="row"
      gap="xs"
      justify="end"
      align="center"
      grow={false}
      shrink={false}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Button.Root
        type="button"
        size="sm"
        sx={lineLayers.action}
        aria-pressed={layer.locked}
        aria-label={lockLabel}
        title={lockLabel}
        onClick={() => toggleLineLock(layer.id)}
      >
        <Button.Icon id={layer.locked ? "unlock" : "lock"} />
      </Button.Root>
      <Button.Root
        type="button"
        size="sm"
        sx={lineLayers.action}
        aria-label={copyLabel}
        title={copyLabel}
        onClick={() => copyLine(layer.id)}
      >
        <Button.Icon id="copy" />
      </Button.Root>
      <Button.Root
        type="button"
        size="sm"
        sx={lineLayers.action}
        aria-label={deleteLabel}
        title={deleteLabel}
        onClick={() => deleteLine(layer.id)}
      >
        <Button.Icon id="trash" />
      </Button.Root>
    </Layout.Stack>
  );
}
