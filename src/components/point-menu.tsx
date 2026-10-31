import * as stylex from "@stylexjs/stylex";
import { Button, Layout, Tokens, Widget } from "@ui";
import { useEffect, useLayoutEffect, useRef } from "react";
import { t } from "../i18n/index.ts";
import type { MessageId } from "../i18n/messages.ts";
import {
  drawPointMark,
  POINT_MARKS,
  type PointMark,
} from "../state/point-marks.ts";
import { isPlainDelete } from "../state/viewport.ts";

export type PointMenuState = {
  x: number;
  y: number;
  layerId: string;
  deleteIndex: number | null;
  insert: { index: number; x: number; y: number } | null;
};

const MARK_LABEL = {
  bolt: "boltMark",
  ring: "ringMark",
  belay: "belayMark",
  rappel: "rappelMark",
} as const satisfies Record<PointMark, MessageId>;

type PointMenuProps = {
  x: number;
  y: number;
  mark: PointMark | null;
  onDelete: (() => void) | null;
  onAdd: (() => void) | null;
  onMark: ((mark: PointMark) => void) | null;
  onClose: () => void;
};

export function PointMenu({
  x,
  y,
  mark,
  onDelete,
  onAdd,
  onMark,
  onClose,
}: PointMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const pad = 8;
    const left = Math.min(
      Math.max(pad, x),
      window.innerWidth - rect.width - pad,
    );
    const top = Math.min(
      Math.max(pad, y),
      window.innerHeight - rect.height - pad,
    );
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }, [x, y]);

  useLayoutEffect(() => {
    focusRef.current?.focus();
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 2) return;
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && menu.contains(event.target))
        return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (!onDelete || !isPlainDelete(event) || isTypingTarget(event.target))
        return;
      event.preventDefault();
      onDelete();
    };
    const onWheel = () => onClose();
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel, true);
    };
  }, [onClose, onDelete]);

  return (
    <Widget.Menu
      ref={menuRef}
      sx={styles.menu}
      data-point-menu=""
      aria-label={t("pointMenu")}
      style={{ left: x, top: y }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {onMark ? (
        <Layout.Stack
          direction="row"
          gap="xs"
          p="xxs"
          role="group"
          aria-label={t("pointMarks")}
        >
          {POINT_MARKS.map((id) => {
            const pressed = mark === id;
            const focusHere =
              pressed || (mark === null && id === POINT_MARKS[0] && !onDelete);
            return (
              <Button.Root
                key={id}
                sx={styles.mark}
                ref={focusHere ? focusRef : undefined}
                type="button"
                role="menuitemcheckbox"
                aria-checked={pressed}
                aria-label={t(MARK_LABEL[id])}
                title={t(MARK_LABEL[id])}
                data-selected={pressed ? "" : undefined}
                onClick={() => onMark(id)}
              >
                <Button.Icon id={id}>
                  <MarkIcon mark={id} />
                </Button.Icon>
              </Button.Root>
            );
          })}
        </Layout.Stack>
      ) : null}
      {onAdd ? (
        <Button.Root
          sx={styles.item}
          ref={onDelete ? undefined : focusRef}
          type="button"
          role="menuitem"
          onClick={onAdd}
        >
          <Button.Text>{t("addPoint")}</Button.Text>
        </Button.Root>
      ) : null}
      {onDelete ? (
        <Button.Root
          sx={styles.item}
          ref={mark ? undefined : focusRef}
          type="button"
          role="menuitem"
          onClick={onDelete}
        >
          <Button.Text>{t("deletePoint")}</Button.Text>
        </Button.Root>
      ) : null}
    </Widget.Menu>
  );
}

function MarkIcon({ mark }: { mark: PointMark }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const size = 22;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    drawPointMark(ctx, mark, 8, 1);
  }, [mark]);
  return (
    <canvas
      {...stylex.props(styles.icon)}
      ref={ref}
      width={22}
      height={22}
      aria-hidden="true"
    />
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

const styles = stylex.create({
  menu: {
    position: "fixed",
    zIndex: 40,
    minWidth: 160,
  },
  item: {
    width: "100%",
    height: "auto",
    justifyContent: "flex-start",
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.md,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.blue[500],
      ":focus-visible": Tokens.color.blue[500],
    },
    color: {
      default: "inherit",
      ":hover": Tokens.color.neutral[0],
      ":focus-visible": Tokens.color.neutral[0],
    },
    textAlign: "start",
  },
  mark: {
    width: Tokens.size.xl,
    height: Tokens.size.xl,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.none,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.blue[500],
      ":focus-visible": Tokens.color.blue[500],
      "[data-selected]": Tokens.color.blue[500],
    },
  },
  icon: {
    display: "block",
    width: 22,
    height: 22,
  },
});
