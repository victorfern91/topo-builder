import * as stylex from "@stylexjs/stylex";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Button,
  Input,
  Layout,
  Popover,
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
import {
  deleteCallout,
  selectCallout,
  setExitColor,
  setLabelColor,
  setLabelText,
  setNoteText,
  toggleExitLock,
  toggleLabelLock,
} from "../state/callouts.ts";
import { t } from "../i18n/index.ts";
import {
  GRADE_PAINT,
  gradeBand,
  gradeLabel,
  gradeOptions,
  gradePaint,
  type GradeBand,
  type GradeSystems,
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
  type LineColor,
  type LineLayer,
  type LineState,
  type MarkedPoint,
} from "../state/lines.ts";
import { standsAlone } from "../state/point-marks.ts";
import { setNumberText } from "../state/route-badge.ts";
import { DEFAULT_NUMBER_TEXT } from "../state/route-number.ts";
import { gradeSystems, preferencesStore } from "../state/preferences.ts";
import { useWidgetChrome, useWidgetFrame } from "../state/use-viewport.ts";
import { lineLayers } from "../styles/stage.ts";
import { MarkGlyph } from "./mark-glyph.tsx";

type NoteRow = {
  row: "note";
  id: string;
  layerId: string;
  text: string;
  color: string;
  locked: boolean;
};

type LabelRow = {
  row: "label";
  id: string;
  text: string;
  color: string;
  locked: boolean;
};

type ExitRow = {
  row: "exit";
  id: string;
  color: string;
  locked: boolean;
};

/** Anchors lead the list, then the lines, then notes, text, and exit arrows. */
type LayerRow = LineLayer | MarkedPoint | NoteRow | LabelRow | ExitRow;

function isAnchorRow(row: LayerRow): row is MarkedPoint {
  return "mark" in row;
}

function isLineRow(row: LayerRow): row is LineLayer {
  return !("mark" in row) && !("row" in row);
}

function isNoteRow(row: LayerRow): row is NoteRow {
  return "row" in row && row.row === "note";
}

function isLabelRow(row: LayerRow): row is LabelRow {
  return "row" in row && row.row === "label";
}

function isExitRow(row: LayerRow): row is ExitRow {
  return "row" in row && row.row === "exit";
}

function kindLabel(row: LayerRow): string {
  if (isAnchorRow(row)) return t("anchorKind");
  if (isNoteRow(row)) return t("observation");
  if (isLabelRow(row)) return t("textLabel");
  if (isExitRow(row)) return t("exitKind");
  return t(row.kind === "route" ? "routeKind" : "boulderKind");
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
    cell: ({ row }) =>
      isLineRow(row.original) ? (
        <LayerOrder layer={row.original} row={row.index} />
      ) : null,
  }),
  layerColumn.display({
    id: "color",
    header: () => t("layerColor"),
    meta: { width: 36, align: "center", headerHidden: true },
    cell: ({ row }) => <LayerSwatch row={row.original} />,
  }),
  layerColumn.display({
    id: "name",
    header: () => t("layerName"),
    cell: ({ row }) => <LayerLabel row={row.original} />,
  }),
  layerColumn.display({
    id: "number",
    header: () => t("layerNumber"),
    meta: { width: 64 },
    cell: ({ row }) =>
      isLineRow(row.original) ? <LayerNumber layer={row.original} /> : null,
  }),
  layerColumn.display({
    id: "grade",
    header: () => t("layerGrade"),
    meta: { width: 108 },
    cell: ({ row }) =>
      isLineRow(row.original) ? <LayerGrade layer={row.original} /> : null,
  }),
  layerColumn.display({
    id: "kind",
    header: () => t("layerKind"),
    meta: { width: 108, align: "end" },
    cell: ({ row }) => (
      <span {...stylex.props(lineLayers.kind)}>{kindLabel(row.original)}</span>
    ),
  }),
  layerColumn.display({
    id: "actions",
    header: () => t("layerActions"),
    meta: { width: 88, align: "end", headerHidden: true },
    cell: ({ row }) => <LayerRowActions row={row.original} />,
  }),
]);

export function LayersPanel() {
  const frame = useWidgetFrame("layers");
  const chrome = useWidgetChrome("layers");
  const visible = useSelector(
    lineStore,
    (state) =>
      state.layers.length > 0 ||
      anchorCount(state) > 0 ||
      state.labels.length > 0 ||
      state.exits.length > 0,
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
      {chrome.minimized ? null : <LayerTable />}
    </Widget.Panel>
  );
}

function LayerTable() {
  const anchors = useSelector(lineStore, anchorPoints, { compare: shallow });
  const layers = useSelector(lineStore, (state) => state.layers);
  const labels = useSelector(lineStore, (state) => state.labels);
  const exits = useSelector(lineStore, (state) => state.exits);
  const rows = useMemo<LayerRow[]>(() => {
    const notes: NoteRow[] = [];
    for (const layer of layers) {
      const color = gradePaint(layer.kind, layer.grade)?.color ?? layer.color;
      for (const note of layer.notes) {
        notes.push({
          row: "note",
          id: note.id,
          layerId: layer.id,
          text: note.text,
          color,
          locked: layer.locked,
        });
      }
    }
    return [
      ...anchors,
      ...layers,
      ...notes,
      ...labels.map((label): LabelRow => ({
        row: "label",
        id: label.id,
        text: label.text,
        color: label.color,
        locked: label.locked,
      })),
      ...exits.map((exit): ExitRow => ({
        row: "exit",
        id: exit.id,
        color: exit.color,
        locked: exit.locked,
      })),
    ];
  }, [anchors, layers, labels, exits]);
  const activeId = useSelector(lineStore, (state) => state.activeId);
  const calloutId = useSelector(lineStore, (state) => state.calloutId);
  const pointId = useSelector(lineStore, selectedPointId);
  const scrollId = useSelector(
    lineStore,
    (state) => state.calloutId ?? state.markId ?? state.activeId,
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
      getRowProps={(row) => ({
        selected: isAnchorRow(row)
          ? row.id === pointId
          : isLineRow(row)
            ? row.id === activeId && calloutId === null
            : row.id === calloutId,
        locked: row.locked,
        onPointerDown: () => {
          if (isAnchorRow(row)) selectMark(row.id);
          else if (isLineRow(row)) selectLine(row.id);
          else selectCallout(row.id);
        },
      })}
      estimateSize={28}
      scrollToId={scrollId}
      aria-label={t("layers")}
    />
  );
}

function LayerGrade({ layer }: { layer: LineLayer }) {
  const systems = useSelector(preferencesStore, gradeSystems, {
    compare: shallow,
  });
  const options = gradeOptions(layer.kind, systems);

  return (
    <Select.Root
      value={layer.grade}
      disabled={layer.locked}
      onValueChange={(grade) => {
        if (typeof grade !== "number") return;
        setLineGrade(layer.id, grade);
      }}
    >
      <Select.Trigger
        aria-label={t(layer.kind === "boulder" ? "boulderGrade" : "routeGrade")}
        sx={lineLayers.gradeTrigger}
      >
        <Select.Value placeholder={t("layerGrade")}>
          {(grade) => (
            <GradeValue
              kind={layer.kind}
              grade={typeof grade === "number" ? grade : null}
              systems={systems}
            />
          )}
        </Select.Value>
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4}>
          <Select.Popup>
            <Select.List>
              {options.map((option, index) => (
                <Select.Item
                  key={option.key}
                  value={index}
                  label={option.label}
                >
                  <Select.ItemIndicator />
                  <GradeSwatch band={option.band} />
                  <Select.ItemText>{option.label}</Select.ItemText>
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
  kind,
  grade,
  systems,
}: {
  kind: LineLayer["kind"];
  grade: number | null;
  systems: GradeSystems;
}) {
  const label = gradeLabel(kind, grade, systems);
  const band = gradeBand(kind, grade);
  if (!label || !band) return t("layerGrade");
  return (
    <>
      <GradeSwatch band={band} />
      <span>{label}</span>
    </>
  );
}

function GradeSwatch({ band }: { band: GradeBand }) {
  const paint = GRADE_PAINT[band];
  return <Select.Swatch color={paint.color} edge={paint.stroke} />;
}

function ColorSteps({
  color,
  disabled,
  onColor,
}: {
  color: string;
  disabled: boolean;
  onColor: (color: LineColor) => void;
}) {
  return (
    <Layout.Stack
      direction="row"
      wrap
      grow={false}
      shrink={false}
      gap="sm"
      role="group"
      aria-label={t("lineColors")}
    >
      {LINE_COLORS.map((value) => {
        const selected = color === value;
        return (
          <Tooltip.Hint key={value} label={value}>
            <Button.Root
              sx={lineLayers.colorStep}
              type="button"
              disabled={disabled}
              aria-label={t("lineColorValue", { color: value })}
              aria-pressed={selected}
              data-selected={selected ? "" : undefined}
              style={{ backgroundColor: value }}
              onClick={() => onColor(value)}
            />
          </Tooltip.Hint>
        );
      })}
    </Layout.Stack>
  );
}

function ColorPopover({
  color,
  disabled,
  onColor,
}: {
  color: string;
  disabled: boolean;
  onColor: (color: LineColor) => void;
}) {
  return (
    <Popover.Root>
      <Tooltip.Hint label={t("layerColor")}>
        <Popover.Trigger
          disabled={disabled}
          aria-label={t("layerColor")}
          sx={lineLayers.swatchButton}
          style={{ backgroundColor: color }}
        />
      </Tooltip.Hint>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup sx={lineLayers.colorPopup}>
            <ColorSteps color={color} disabled={disabled} onColor={onColor} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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
function LayerOrder({ layer, row }: { layer: LineLayer; row: number }) {
  const lead = useSelector(lineStore, anchorCount);
  const count = useSelector(lineStore, (state) => state.layers.length);
  const index = row - lead;
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

function LayerSwatch({ row }: { row: LayerRow }) {
  if (isAnchorRow(row)) return <AnchorGlyph point={row} />;
  if (isNoteRow(row)) return <Swatch color={row.color} />;
  if (isLabelRow(row)) {
    return (
      <ColorPopover
        color={row.color}
        disabled={row.locked}
        onColor={(color) => setLabelColor(row.id, color)}
      />
    );
  }
  if (isExitRow(row)) {
    return (
      <ColorPopover
        color={row.color}
        disabled={row.locked}
        onColor={(color) => setExitColor(row.id, color)}
      />
    );
  }
  const paint = gradePaint(row.kind, row.grade);
  if (paint) {
    return <Swatch color={paint.color} edge={paint.stroke} />;
  }
  return (
    <ColorPopover
      color={row.color}
      disabled={row.locked}
      onColor={(color) => setLineColor(row.id, color)}
    />
  );
}

function Swatch({ color, edge }: { color: string; edge?: string }) {
  return (
    <Layout.Box
      renderAs="span"
      display="inline-block"
      sx={lineLayers.swatch}
      style={{
        backgroundColor: color,
        boxShadow: `inset 0 0 0 1px ${edge ?? "rgba(0, 0, 0, 0.45)"}`,
      }}
    />
  );
}

function LayerLabel({ row }: { row: LayerRow }) {
  if (isAnchorRow(row)) return <AnchorName point={row} />;
  if (isNoteRow(row)) {
    return (
      <Input.Root
        sx={lineLayers.name}
        id={layerNameId(row.id)}
        aria-label={t("observation")}
        value={row.text}
        disabled={row.locked}
        spellCheck={false}
        autoComplete="off"
        onValueChange={(value) => setNoteText(row.id, value)}
        onFocus={() => selectCallout(row.id)}
      />
    );
  }
  if (isLabelRow(row)) {
    return (
      <Input.Root
        sx={lineLayers.name}
        id={layerNameId(row.id)}
        aria-label={t("textLabel")}
        value={row.text}
        disabled={row.locked}
        spellCheck={false}
        autoComplete="off"
        onValueChange={(value) => setLabelText(row.id, value)}
        onFocus={() => selectCallout(row.id)}
      />
    );
  }
  if (isExitRow(row)) {
    return <span {...stylex.props(lineLayers.kind)}>{t("exitArrow")}</span>;
  }
  return <LayerName layer={row} />;
}

function LayerRowActions({ row }: { row: LayerRow }) {
  if (isAnchorRow(row)) return <AnchorActions point={row} />;
  if (isLineRow(row)) return <LayerActions layer={row} />;
  if (isNoteRow(row)) {
    return <CalloutActions id={row.id} locked={row.locked} onLock={null} />;
  }
  return (
    <CalloutActions
      id={row.id}
      locked={row.locked}
      onLock={() =>
        isLabelRow(row) ? toggleLabelLock(row.id) : toggleExitLock(row.id)
      }
    />
  );
}

function CalloutActions({
  id,
  locked,
  onLock,
}: {
  id: string;
  locked: boolean;
  onLock: (() => void) | null;
}) {
  const deleteLabel = t("deleteLayer");
  const lockLabel = t(locked ? "unlockLayer" : "lockLayer");
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
      {onLock ? (
        <Tooltip.Hint label={lockLabel}>
          <Button.Root
            type="button"
            size="sm"
            sx={lineLayers.action}
            aria-pressed={locked}
            aria-label={lockLabel}
            onClick={onLock}
          >
            <Button.Icon id={locked ? "unlock" : "lock"} />
          </Button.Root>
        </Tooltip.Hint>
      ) : null}
      <Tooltip.Hint label={deleteLabel}>
        <Button.Root
          type="button"
          size="sm"
          sx={lineLayers.action}
          aria-label={deleteLabel}
          disabled={locked}
          onClick={() => deleteCallout(id)}
        >
          <Button.Icon id="trash" />
        </Button.Root>
      </Tooltip.Hint>
    </Layout.Stack>
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
