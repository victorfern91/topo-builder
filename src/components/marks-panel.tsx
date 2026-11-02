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
  lineStore,
  selectedAnchorMark,
  toggleAnchorMark,
} from "../state/lines.ts";
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
import { useViewport, useWidgetFrame } from "../state/use-viewport.ts";
import { MarkGlyph } from "./mark-glyph.tsx";

const DRAG_SLOP = 3;

type StageRef = RefObject<HTMLDivElement | null>;

/** Palette of point marks. Drag one onto a route point to mark it. */
export function MarksPanel({ stageRef }: { stageRef: StageRef }) {
  const frame = useWidgetFrame("marks");
  const visible = useSelector(lineStore, (state) => state.layers.length > 0);
  useEffect(() => endMarkDrag, []);
  if (!visible) return null;
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

function MarkTile({ mark, stageRef }: { mark: PointMark; stageRef: StageRef }) {
  const { getState } = useViewport();
  const free = isFreeMark(mark);
  const pressed = useSelector(
    lineStore,
    (state) => !free && selectedAnchorMark(state) === mark,
  );
  const dragging = useSelector(markDragStore, (drag) => drag?.mark === mark);
  const press = useRef<Press | null>(null);
  const skipClick = useRef(false);
  const label = t(MARK_LABEL[mark]);

  useEffect(() => {
    if (!dragging) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      press.current = null;
      endMarkDrag();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [dragging]);

  const track = (event: ReactPointerEvent<HTMLElement>) => {
    const view = getState();
    moveMarkDrag(
      mark,
      event.clientX,
      event.clientY,
      markDropTarget(
        mark,
        event.clientX,
        event.clientY,
        stageRef.current,
        view,
      ),
      view.zoom,
    );
  };

  const release = (event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return false;
    press.current = null;
    return current.dragging;
  };

  return (
    <Button.Root
      sx={styles.tile}
      type="button"
      aria-label={label}
      aria-pressed={free ? undefined : pressed}
      title={`${label}. ${t(DROP_HINT[MARK_KIND[mark]])}`}
      onPointerDown={(event) => {
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
      }}
      onPointerMove={(event) => {
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
        track(event);
      }}
      onPointerUp={(event) => {
        if (!release(event)) return;
        track(event);
        dropMarkDrag(getState().zoom);
      }}
      onPointerCancel={(event) => {
        if (release(event)) endMarkDrag();
      }}
      onLostPointerCapture={(event) => {
        if (release(event)) endMarkDrag();
      }}
      onClick={() => {
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        const state = lineStore.get();
        if (free || state.activeId === null || state.anchorIndex === null)
          return;
        toggleAnchorMark(
          state.activeId,
          state.anchorIndex,
          mark,
          magnetReach(getState().zoom, state.scale),
        );
      }}
    >
      <Button.Icon id={mark}>
        <MarkGlyph mark={mark} size={22} />
      </Button.Icon>
    </Button.Root>
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
