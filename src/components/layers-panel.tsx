import * as stylex from "@stylexjs/stylex";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Button,
  Input,
  Layout,
  Select,
  Table,
  Tooltip,
  Widget,
  type TableFeatures,
} from "@ui";
import { useSelector } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { t } from "../i18n/index.ts";
import {
  GRADE_PAINT,
  GRADE_STEPS,
  gradeLabel,
  gradePaint,
  type GradeBand,
  type GradeSystem,
} from "../state/grade.ts";
import {
  LINE_COLORS,
  anchorPoints,
  copyLine,
  deleteLine,
  deleteMark,
  lineStore,
  moveLine,
  renameLine,
  renameMark,
  selectedPointId,
  selectLine,
  selectMark,
  setLineColor,
  setLineGrade,
  toggleLineLock,
  toggleMarkLock,
  type LineLayer,
  type LineState,
  type MarkedPoint,
} from "../state/lines.ts";
import { standsAlone } from "../state/point-marks.ts";
import { setNumberText } from "../state/route-badge.ts";
import { DEFAULT_NUMBER_TEXT } from "../state/route-number.ts";
import { preferencesStore } from "../state/preferences.ts";
import { useWidgetChrome, useWidgetFrame } from "../state/use-viewport.ts";
import { lineLayers } from "../styles/stage.ts";
import { MarkGlyph } from "./mark-glyph.tsx";

/** Anchors lead the list, then the lines in store order. */
type LayerRow = LineLayer | MarkedPoint;

function isAnchorRow(row: LayerRow): row is MarkedPoint {
  return "mark" in row;
}

function anchorCount(state: LineState): number {
  let count = 0;
  for (const point of state.points) if (standsAlone(point.mark)) count += 1;
  return count;
}

const layerColumn = createColumnHelper<TableFeatures, LayerRow>();

/** Below the anchors, a line's place is its number, and the same number is drawn on the photo. */
const layerColumns = layerColumn.columns([
  layerColumn.display({
    id: "order",
    header: () => t("layerOrder"),
    meta: { width: 80, align: "end" },
    cell: ({ row, table }) =>
      isAnchorRow(row.original) ? null : (
        <LayerOrder
          layer={row.original}
          row={row.index}
          rows={table.options.data.length}
        />
      ),
  }),
  layerColumn.display({
    id: "color",
    header: () => t("layerColor"),
    meta: { width: 28, align: "center", headerHidden: true },
    cell: ({ row }) =>
      isAnchorRow(row.original) ? (
        <AnchorGlyph point={row.original} />
      ) : (
        <LayerColor layer={row.original} />
      ),
  }),
  layerColumn.display({
    id: "name",
    header: () => t("layerName"),
    cell: ({ row }) =>
      isAnchorRow(row.original) ? (
        <AnchorName point={row.original} />
      ) : (
        <LayerName layer={row.original} />
      ),
  }),
  layerColumn.display({
    id: "number",
    header: () => t("layerNumber"),
    meta: { width: 64 },
    cell: ({ row }) =>
      isAnchorRow(row.original) ? null : <LayerNumber layer={row.original} />,
  }),
  layerColumn.display({
    id: "grade",
    header: () => t("layerGrade"),
    meta: { width: 108 },
    cell: ({ row }) =>
      isAnchorRow(row.original) ? null : <LayerGrade layer={row.original} />,
  }),
  layerColumn.display({
    id: "kind",
    header: () => t("layerKind"),
    meta: { width: 72, align: "end" },
    cell: ({ row }) => (
      <span {...stylex.props(lineLayers.kind)}>
        {t(
          isAnchorRow(row.original)
            ? "anchorKind"
            : row.original.kind === "route"
              ? "routeKind"
              : "boulderKind",
        )}
      </span>
    ),
  }),
  layerColumn.display({
    id: "actions",
    header: () => t("layerActions"),
    meta: { width: 88, align: "end", headerHidden: true },
    cell: ({ row }) =>
      isAnchorRow(row.original) ? (
        <AnchorActions point={row.original} />
      ) : (
        <LayerActions layer={row.original} />
      ),
  }),
]);

export function LayersPanel() {
  const frame = useWidgetFrame("layers");
  const chrome = useWidgetChrome("layers");
  const visible = useSelector(
    lineStore,
    (state) => state.layers.length > 0 || anchorCount(state) > 0,
  );
  if (!chrome.open || !visible) return null;

  return (
    <Widget.Panel
      {...frame}
      minimized={chrome.minimized}
      renderAs="section"
      resizable
      minWidth={400}
      minHeight={120}
      resizeLabel={t("resizePanel")}
      sx={lineLayers.root}
      data-layers=""
      aria-label={t("layers")}
    >
      <Widget.Header
        label={t("dragLayers")}
        minimized={chrome.minimized}
        onMinimize={chrome.onMinimize}
        onClose={chrome.onClose}
        closeLabel={t("closePanel")}
        minimizeLabel={t("minimizePanel")}
        restoreLabel={t("restorePanel")}
      >
        {t("layers")}
      </Widget.Header>
      {chrome.minimized ? null : (
        <>
          <LayerColors />
          <LayerTable />
        </>
      )}
    </Widget.Panel>
  );
}

function LayerTable() {
  const anchors = useSelector(lineStore, anchorPoints, { compare: shallow });
  const layers = useSelector(lineStore, (state) => state.layers);
  const rows = useMemo<LayerRow[]>(
    () => [...anchors, ...layers],
    [anchors, layers],
  );
  const activeId = useSelector(lineStore, (state) => state.activeId);
  const pointId = useSelector(lineStore, selectedPointId);
  const scrollId = useSelector(
    lineStore,
    (state) => state.markId ?? state.activeId,
  );
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
      data={rows}
      columns={layerColumns}
      getRowId={layerRowId}
      getRowProps={(row) =>
        isAnchorRow(row)
          ? {
              selected: row.id === pointId,
              locked: row.locked,
              onPointerDown: () => selectMark(row.id),
            }
          : {
              selected: row.id === activeId,
              locked: row.locked,
              onPointerDown: () => selectLine(row.id),
            }
      }
      estimateSize={28}
      scrollToId={scrollId}
      aria-label={t("layers")}
    />
  );
}

function LayerColors() {
  const kind = useSelector(lineStore, (state) => {
    const active = state.layers.find((item) => item.id === state.activeId);
    return active?.kind ?? null;
  });
  if (kind === "boulder") return <BoulderColors />;
  return null;
}

function BoulderColors() {
  const layer = useSelector(
    lineStore,
    (state) => {
      const active = state.layers.find((item) => item.id === state.activeId);
      if (!active || active.kind !== "boulder") return null;
      return { id: active.id, color: active.color, locked: active.locked };
    },
    { compare: shallow },
  );
  if (!layer) return null;
  return <ColorSteps layer={layer} />;
}

function LayerGrade({ layer }: { layer: LineLayer }) {
  const system = useSelector(preferencesStore, (state) => state.gradeSystem);
  if (layer.kind !== "route") return null;

  return (
    <Select.Root
      value={layer.grade}
      disabled={layer.locked}
      onValueChange={(grade) => {
        if (typeof grade !== "number") return;
        setLineGrade(layer.id, grade);
      }}
    >
      <Select.Trigger aria-label={t("routeGrade")} sx={lineLayers.gradeTrigger}>
        <Select.Value placeholder={t("layerGrade")}>
          {(grade) => (
            <GradeValue
              grade={typeof grade === "number" ? grade : null}
              system={system}
            />
          )}
        </Select.Value>
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4}>
          <Select.Popup>
            <Select.List>
              {GRADE_STEPS.map((step, index) => (
                <Select.Item
                  key={step.french}
                  value={index}
                  label={step[system]}
                >
                  <Select.ItemIndicator />
                  <GradeSwatch band={step.band} />
                  <Select.ItemText>{step[system]}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function GradeValue({
  grade,
  system,
}: {
  grade: number | null;
  system: GradeSystem;
}) {
  const label = gradeLabel(grade, system);
  const step = grade == null ? null : GRADE_STEPS[grade];
  if (!label || !step) return t("layerGrade");
  return (
    <>
      <GradeSwatch band={step.band} />
      <span>{label}</span>
    </>
  );
}

function GradeSwatch({ band }: { band: GradeBand }) {
  const paint = GRADE_PAINT[band];
  return <Select.Swatch color={paint.color} edge={paint.stroke} />;
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
          <Tooltip.Hint key={value} label={value}>
            <Button.Root
              sx={lineLayers.colorStep}
              type="button"
              disabled={layer.locked}
              aria-label={t("lineColorValue", { color: value })}
              aria-pressed={selected}
              data-selected={selected ? "" : undefined}
              style={{ backgroundColor: value }}
              onClick={() => setLineColor(layer.id, value)}
            />
          </Tooltip.Hint>
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

/** `row` and `rows` count table rows. Anchor rows above the lines are skipped. */
function LayerOrder({
  layer,
  row,
  rows,
}: {
  layer: LineLayer;
  row: number;
  rows: number;
}) {
  const lead = useSelector(lineStore, anchorCount);
  const index = row - lead;
  const count = rows - lead;
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
    current.to = Math.max(0, next - lead);
    setDropRow(root, current.to + lead);
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
      <Tooltip.Hint label={upLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-label={upLabel}
          disabled={index === 0}
          onClick={() => {
            selectLine(layer.id);
            moveLine(layer.id, index - 1);
          }}
        >
          <Button.Icon id="chevron-up" />
        </Button.Root>
      </Tooltip.Hint>
      <Tooltip.Hint label={reorderHint}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.orderHandle}
          aria-label={reorderLabel}
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
      </Tooltip.Hint>
      <Tooltip.Hint label={downLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-label={downLabel}
          disabled={index >= count - 1}
          onClick={() => {
            selectLine(layer.id);
            moveLine(layer.id, index + 1);
          }}
        >
          <Button.Icon id="chevron-down" />
        </Button.Root>
      </Tooltip.Hint>
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

function LayerColor({ layer }: { layer: LineLayer }) {
  const paint = gradePaint(layer.grade);
  return (
    <Layout.Box
      renderAs="span"
      display="inline-block"
      sx={lineLayers.swatch}
      style={
        paint
          ? {
              backgroundColor: paint.color,
              boxShadow: `inset 0 0 0 1px ${paint.stroke}`,
            }
          : { backgroundColor: layer.color }
      }
    />
  );
}

function layerNameId(id: string): string {
  return `layer-name-${id}`;
}

function layerRowId(row: LayerRow): string {
  return row.id;
}

function AnchorGlyph({ point }: { point: MarkedPoint }) {
  return (
    <Layout.Box renderAs="span" display="inline-block">
      <MarkGlyph mark={point.mark} size={16} />
    </Layout.Box>
  );
}

function AnchorName({ point }: { point: MarkedPoint }) {
  return (
    <Input.Root
      sx={lineLayers.name}
      id={layerNameId(point.id)}
      aria-label={t("layerName")}
      value={point.name}
      disabled={point.locked}
      spellCheck={false}
      autoComplete="off"
      onValueChange={(value) => renameMark(point.id, value)}
      onFocus={() => selectMark(point.id)}
    />
  );
}

function AnchorActions({ point }: { point: MarkedPoint }) {
  const lockLabel = t(point.locked ? "unlockLayer" : "lockLayer");
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
      <Tooltip.Hint label={lockLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-pressed={point.locked}
          aria-label={lockLabel}
          onClick={() => toggleMarkLock(point.id)}
        >
          <Button.Icon id={point.locked ? "unlock" : "lock"} />
        </Button.Root>
      </Tooltip.Hint>
      <Tooltip.Hint label={deleteLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-label={deleteLabel}
          disabled={point.locked}
          onClick={() => deleteMark(point.id)}
        >
          <Button.Icon id="trash" />
        </Button.Root>
      </Tooltip.Hint>
    </Layout.Stack>
  );
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

function LayerNumber({ layer }: { layer: LineLayer }) {
  return (
    <Input.Root
      sx={lineLayers.name}
      aria-label={t("numberBadge")}
      value={layer.numberText}
      placeholder={DEFAULT_NUMBER_TEXT}
      disabled={layer.locked}
      spellCheck={false}
      autoComplete="off"
      onValueChange={(value) => setNumberText(layer.id, value)}
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
      <Tooltip.Hint label={lockLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-pressed={layer.locked}
          aria-label={lockLabel}
          onClick={() => toggleLineLock(layer.id)}
        >
          <Button.Icon id={layer.locked ? "unlock" : "lock"} />
        </Button.Root>
      </Tooltip.Hint>
      <Tooltip.Hint label={copyLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-label={copyLabel}
          onClick={() => copyLine(layer.id)}
        >
          <Button.Icon id="copy" />
        </Button.Root>
      </Tooltip.Hint>
      <Tooltip.Hint label={deleteLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-label={deleteLabel}
          onClick={() => deleteLine(layer.id)}
        >
          <Button.Icon id="trash" />
        </Button.Root>
      </Tooltip.Hint>
    </Layout.Stack>
  );
}
