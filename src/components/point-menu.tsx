import * as stylex from "@stylexjs/stylex";
import { Button, Layout, Tokens, Widget } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useLayoutEffect, useRef } from "react";
import { t } from "../i18n/index.ts";
import {
  pointMenuStore,
  setPointMenu,
  type PointMenuState,
} from "../state/point-menu.ts";
import {
  addRouteNumber,
  anchorMark,
  clearRouteNumber,
  deleteAnchor,
  insertAnchor,
  lineStore,
  toggleAnchorMark,
} from "../state/lines.ts";
import {
  isFreeMark,
  magnetReach,
  MARK_LABEL,
  POINT_MARKS,
  type PointMark,
} from "../state/point-marks.ts";
import { useViewport } from "../state/use-viewport.ts";
import { isPlainDelete } from "../state/viewport.ts";
import { MarkGlyph } from "./mark-glyph.tsx";

const ROUTE_MARKS = POINT_MARKS.filter((mark) => !isFreeMark(mark));

/** Subscribes to the point menu on its own, so the stage does not hold it. */
export function PointMenuHost() {
  const menu = useSelector(pointMenuStore, (state) => state);
  useEffect(() => () => setPointMenu(null), []);
  if (!menu) return null;
  return <PointMenuFrame menu={menu} />;
}

type PointMenuProps = {
  x: number;
  y: number;
  mark: PointMark | null;
  onDelete: (() => void) | null;
  onAdd: (() => void) | null;
  onAddNumber: (() => void) | null;
  onRemoveNumber: (() => void) | null;
  onMark: ((mark: PointMark) => void) | null;
  onClose: () => void;
};

export function PointMenu({
  x,
  y,
  mark,
  onDelete,
  onAdd,
  onAddNumber,
  onRemoveNumber,
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
          {ROUTE_MARKS.map((id) => {
            const pressed = mark === id;
            const focusHere =
              pressed || (mark === null && id === ROUTE_MARKS[0] && !onDelete);
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
                  <MarkGlyph mark={id} size={22} />
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
      {onAddNumber ? (
        <Button.Root
          sx={styles.item}
          ref={onAdd || onDelete || onMark ? undefined : focusRef}
          type="button"
          role="menuitem"
          onClick={onAddNumber}
        >
          <Button.Text>{t("addNumber")}</Button.Text>
        </Button.Root>
      ) : null}
      {onRemoveNumber ? (
        <Button.Root
          sx={styles.item}
          ref={onAdd || onDelete || onMark ? undefined : focusRef}
          type="button"
          role="menuitem"
          onClick={onRemoveNumber}
        >
          <Button.Text>{t("removeNumber")}</Button.Text>
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

function PointMenuFrame({ menu }: { menu: PointMenuState }) {
  const { getState } = useViewport();
  const index = menu.deleteIndex;
  const close = () => setPointMenu(null);
  return (
    <PointMenu
      x={menu.x}
      y={menu.y}
      mark={index === null ? null : anchorMark(menu.layerId, index)}
      onDelete={
        index === null
          ? null
          : () => {
              deleteAnchor(menu.layerId, index);
              close();
            }
      }
      onAdd={
        menu.insert
          ? () => {
              const insert = menu.insert;
              if (!insert) return;
              insertAnchor(
                menu.layerId,
                insert.index,
                insert.x,
                insert.y,
                magnetReach(getState().zoom, lineStore.get().scale),
              );
              close();
            }
          : null
      }
      onAddNumber={
        menu.number === "add"
          ? () => {
              addRouteNumber(menu.layerId, menu.at.x, menu.at.y);
              close();
            }
          : null
      }
      onRemoveNumber={
        menu.number === "remove"
          ? () => {
              clearRouteNumber(menu.layerId);
              close();
            }
          : null
      }
      onMark={
        index === null
          ? null
          : (mark) => {
              toggleAnchorMark(
                menu.layerId,
                index,
                mark,
                magnetReach(getState().zoom, lineStore.get().scale),
              );
              close();
            }
      }
      onClose={close}
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
});
