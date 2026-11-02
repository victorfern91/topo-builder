import * as stylex from "@stylexjs/stylex";
import { Button, Layout, Tokens, Widget } from "@ui";
import { useSelector } from "@tanstack/react-store";
import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { t } from "../i18n/index.ts";
import type { MessageId } from "../i18n/messages.ts";
import {
  badgeDragStore,
  badgeDropTarget,
  dropBadgeDrag,
  endBadgeDrag,
  moveBadgeDrag,
} from "../state/badge-drag.ts";
import { gradeLabel, type GradeSystem } from "../state/grade.ts";
import {
  findLayer,
  lineStore,
  selectedAnchorMark,
  toggleAnchorMark,
} from "../state/lines.ts";
import { addRouteNumber, clearRouteNumbers } from "../state/route-badge.ts";
import { preferencesStore } from "../state/preferences.ts";
import {
  badgeLabel,
  badgeSpots,
  DEFAULT_NUMBER_TEXT,
  ROUTE_BADGES,
  type RouteBadge,
} from "../state/route-number.ts";
import {
  dropMarkDrag,
  endMarkDrag,
  markDragStore,
  markDropTarget,
  moveMarkDrag,
} from "../state/mark-drag.ts";
import {
  isFreeMark,
  magnetReach,
  MARK_KIND,
  MARK_KIND_LABEL,
  MARK_KINDS,
  MARK_LABEL,
  POINT_MARKS,
  type MarkKind,
  type PointMark,
} from "../state/point-marks.ts";
import {
  useViewport,
  useViewportSelector,
  useWidgetFrame,
} from "../state/use-viewport.ts";
import { BadgePill } from "./canvas/badge-pill.tsx";
import { MarkGlyph } from "./mark-glyph.tsx";

const DRAG_SLOP = 3;

type StageRef = RefObject<HTMLDivElement | null>;

/** Palette of point marks. Drag one onto the photo or a route point to place it. */
export function MarksPanel({ stageRef }: { stageRef: StageRef }) {
  const frame = useWidgetFrame("marks");
  useEffect(() => endMarkDrag, []);
  useEffect(() => endBadgeDrag, []);
  return (
    <Widget.Panel
      {...frame}
      renderAs="aside"
      sx={styles.panel}
      data-marks=""
      aria-label={t("marks")}
    >
      <Widget.Header label={t("dragMarks")}>{t("marks")}</Widget.Header>
      <Widget.Container gap="sm" p="md" aria-label={t("pointMarks")}>
        {MARK_KINDS.map((kind) => (
          <Layout.Stack
            key={kind}
            gap="xxs"
            role="group"
            aria-label={t(MARK_KIND_LABEL[kind])}
          >
            <Layout.Box renderAs="span" sx={styles.kind}>
              {t(MARK_KIND_LABEL[kind])}
            </Layout.Box>
            <Layout.Stack direction="row" wrap gap="xs">
              {POINT_MARKS.filter((mark) => MARK_KIND[mark] === kind).map(
                (mark) => (
                  <MarkTile key={mark} mark={mark} stageRef={stageRef} />
                ),
              )}
              {kind === "characteristic"
                ? ROUTE_BADGES.map((badge) => (
                    <BadgeTile key={badge} badge={badge} stageRef={stageRef} />
                  ))
                : null}
            </Layout.Stack>
          </Layout.Stack>
        ))}
      </Widget.Container>
    </Widget.Panel>
  );
}

const DROP_HINT = {
  anchor: "dropMarkHint",
  characteristic: "dropCharacteristicHint",
  material: "dropMaterialHint",
} as const satisfies Record<MarkKind, MessageId>;

type Press = { id: number; x: number; y: number; dragging: boolean };

type PaletteDrag = {
  /** True while this tile's drag is live. Escape then cancels it. */
  dragging: boolean;
  move: (clientX: number, clientY: number) => void;
  drop: () => void;
  cancel: () => void;
  click: () => void;
};

/** Pointer handlers for a palette tile: a press past the slop drags, a plain press clicks. */
function usePaletteDrag({ dragging, move, drop, cancel, click }: PaletteDrag) {
  const press = useRef<Press | null>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    if (!dragging) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      press.current = null;
      cancel();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [dragging, cancel]);

  const release = (event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return false;
    press.current = null;
    return current.dragging;
  };

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      skipClick.current = false;
      press.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
      };
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const current = press.current;
      if (!current || current.id !== event.pointerId) return;
      if (
        !current.dragging &&
        Math.hypot(event.clientX - current.x, event.clientY - current.y) <
          DRAG_SLOP
      )
        return;
      current.dragging = true;
      skipClick.current = true;
      move(event.clientX, event.clientY);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      if (!release(event)) return;
      move(event.clientX, event.clientY);
      drop();
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      if (release(event)) cancel();
    },
    onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => {
      if (release(event)) cancel();
    },
    onClick: () => {
      if (skipClick.current) {
        skipClick.current = false;
        return;
      }
      click();
    },
  };
}

function MarkTile({ mark, stageRef }: { mark: PointMark; stageRef: StageRef }) {
  const { getState } = useViewport();
  const free = isFreeMark(mark);
  const pressed = useSelector(
    lineStore,
    (state) => !free && selectedAnchorMark(state) === mark,
  );
  const dragging = useSelector(markDragStore, (drag) => drag?.mark === mark);
  const label = t(MARK_LABEL[mark]);
  const handlers = usePaletteDrag({
    dragging,
    move: (clientX, clientY) => {
      const view = getState();
      moveMarkDrag(
        mark,
        clientX,
        clientY,
        markDropTarget(mark, clientX, clientY, stageRef.current, view),
        view.zoom,
      );
    },
    drop: () => dropMarkDrag(getState().zoom),
    cancel: endMarkDrag,
    click: () => {
      const state = lineStore.get();
      if (free || state.activeId === null || state.anchorIndex === null) return;
      toggleAnchorMark(
        state.activeId,
        state.anchorIndex,
        mark,
        magnetReach(getState().zoom, state.scale),
      );
    },
  });

  return (
    <Button.Root
      sx={styles.tile}
      type="button"
      aria-label={label}
      aria-pressed={free ? undefined : pressed}
      title={`${label}. ${t(DROP_HINT[MARK_KIND[mark]])}`}
      {...handlers}
    >
      <Button.Icon id={mark}>
        <MarkGlyph mark={mark} size={22} />
      </Button.Icon>
    </Button.Root>
  );
}

const BADGE_LABEL = {
  number: "numberBadge",
  grade: "gradeBadge",
} as const satisfies Record<RouteBadge, MessageId>;

const BADGE_HINT = {
  number: "dropNumberHint",
  grade: "dropGradeHint",
} as const satisfies Record<RouteBadge, MessageId>;

/** Sample text on a palette badge, before it lands beside a route. */
function sampleBadgeText(badge: RouteBadge, system: GradeSystem): string {
  if (badge === "number") return DEFAULT_NUMBER_TEXT;
  return gradeLabel(SAMPLE_GRADE, system) ?? "";
}

const SAMPLE_GRADE = 9;

/** Number or grade pill. Drag it beside a route, or click to toggle it on the selected line. */
function BadgeTile({
  badge,
  stageRef,
}: {
  badge: RouteBadge;
  stageRef: StageRef;
}) {
  const { getState } = useViewport();
  const system = useSelector(preferencesStore, (state) => state.gradeSystem);
  const pressed = useSelector(lineStore, (state) => {
    const layer = findLayer(state, state.activeId);
    return layer ? badgeSpots(layer, badge).length > 0 : false;
  });
  const dragging = useSelector(badgeDragStore, (drag) => drag?.badge === badge);
  const label = t(BADGE_LABEL[badge]);
  const handlers = usePaletteDrag({
    dragging,
    move: (clientX, clientY) =>
      moveBadgeDrag(
        badge,
        clientX,
        clientY,
        badgeDropTarget(badge, clientX, clientY, stageRef.current, getState()),
      ),
    drop: dropBadgeDrag,
    cancel: endBadgeDrag,
    click: () => {
      const layer = findLayer(lineStore.get(), lineStore.get().activeId);
      const start = layer?.anchors[0];
      if (!layer || !start) return;
      if (badgeSpots(layer, badge).length > 0)
        clearRouteNumbers(layer.id, badge);
      else addRouteNumber(layer.id, badge, start.x, start.y);
    },
  });

  return (
    <Button.Root
      sx={styles.badgeTile}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={`${label}. ${t(BADGE_HINT[badge])}`}
      {...handlers}
    >
      <BadgePill badge={badge}>{sampleBadgeText(badge, system)}</BadgePill>
    </Button.Root>
  );
}

/** The badge under the pointer while it is dragged from the palette. */
export function BadgeDragGhost() {
  const drag = useSelector(badgeDragStore, (state) => state);
  const system = useSelector(preferencesStore, (state) => state.gradeSystem);
  const text = useSelector(lineStore, (state) => {
    if (!drag?.layerId) return null;
    const layer = findLayer(state, drag.layerId);
    return layer ? badgeLabel(layer, drag.badge, system) : null;
  });
  const drawScale = useSelector(lineStore, (state) => state.scale);
  const zoom = useViewportSelector((state) => state.zoom);
  if (!drag) return null;
  const size = Math.min(4, Math.max(0.5, zoom * drawScale));
  return (
    <div
      {...stylex.props(styles.ghost)}
      data-over={drag.layerId ? "" : undefined}
      style={{
        transform: `translate3d(${drag.x}px, ${drag.y}px, 0) translate(-50%, -50%) scale(${size})`,
      }}
      aria-hidden="true"
    >
      <BadgePill badge={drag.badge}>
        {text ?? sampleBadgeText(drag.badge, system)}
      </BadgePill>
    </div>
  );
}

/** The mark under the pointer while it is dragged from the palette. */
export function MarkDragGhost() {
  const drag = useSelector(markDragStore, (state) => state);
  if (!drag) return null;
  return (
    <div
      {...stylex.props(styles.ghost)}
      data-over={drag.over ? "" : undefined}
      style={{
        transform: `translate3d(${drag.x - drag.size / 2}px, ${drag.y - drag.size / 2}px, 0)`,
      }}
      aria-hidden="true"
    >
      <MarkGlyph mark={drag.mark} size={drag.size} />
    </div>
  );
}

const styles = stylex.create({
  panel: {
    zIndex: 4,
    width: 196,
    overflow: "hidden",
  },
  kind: {
    fontSize: 11,
    color: Tokens.color.neutral[400],
  },
  tile: {
    width: Tokens.size.lg,
    height: Tokens.size.lg,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.none,
    touchAction: "none",
    cursor: "grab",
  },
  badgeTile: {
    minWidth: Tokens.size.lg,
    height: Tokens.size.lg,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.xs,
    touchAction: "none",
    cursor: "grab",
  },
  ghost: {
    position: "fixed",
    top: Tokens.spacing.none,
    left: Tokens.spacing.none,
    zIndex: 50,
    lineHeight: 0,
    pointerEvents: "none",
    opacity: {
      default: 0.6,
      "[data-over]": 1,
    },
    filter: `drop-shadow(0 2px 4px ${Tokens.color.black[45]})`,
  },
});
