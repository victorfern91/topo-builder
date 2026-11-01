import * as stylex from "@stylexjs/stylex";
import { Button, Layout, Tokens, Widget } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect, useId, useRef } from "react";
import { t } from "../i18n/index.ts";
import type { MessageId } from "../i18n/messages.ts";
import { imageDocumentStore } from "../state/image-document.ts";
import { beginLine, ensureLine } from "../state/lines.ts";
import {
  applyToolClick,
  CREATE_TOOLS,
  selectCreate,
  selectGroup,
  selectZoom,
  toolStore,
  ZOOM_COMMANDS,
  ZOOM_TOOLS,
  type CreateToolId,
  type ZoomCommandId,
  type ZoomToolId,
} from "../state/tools.ts";
import { useViewport, useWidgetFrame } from "../state/use-viewport.ts";
import type { ViewportKeyId } from "../state/viewport.ts";

const ZOOM_TOOL_OPTIONS: {
  id: ZoomToolId;
  label: MessageId;
  shortcut: ViewportKeyId;
}[] = [
  { id: "zoom-in", label: "zoomIn", shortcut: "zoom-in" },
  { id: "zoom-out", label: "zoomOut", shortcut: "zoom-out" },
];

const ZOOM_COMMAND_OPTIONS: {
  id: ZoomCommandId;
  label: MessageId;
  shortcut: ViewportKeyId;
}[] = [
  { id: "fit", label: "fitWindow", shortcut: "fit" },
  { id: "actual-size", label: "actualSize", shortcut: "actual-size" },
];

const CREATE_TOOL_OPTIONS: { id: CreateToolId; label: MessageId }[] = [
  { id: "route", label: "createRoute" },
  { id: "boulder", label: "createBoulder" },
];

type ToolFlyout = "zoom" | "create";

const flyoutStore = new Store<ToolFlyout | null>(null);
let closeTimer: number | null = null;

function cancelClose(): void {
  if (closeTimer != null) window.clearTimeout(closeTimer);
  closeTimer = null;
}

function closeFlyout(): void {
  cancelClose();
  flyoutStore.setState((current) => (current === null ? current : null));
}

function openFlyout(id: ToolFlyout): void {
  cancelClose();
  flyoutStore.setState((current) => (current === id ? current : id));
}

function scheduleClose(id: ToolFlyout): void {
  cancelClose();
  closeTimer = window.setTimeout(() => {
    closeTimer = null;
    flyoutStore.setState((current) => (current === id ? null : current));
  }, 160);
}

function useFlyout(id: ToolFlyout) {
  const open = useSelector(flyoutStore, (current) => current === id);
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFlyout();
    };
    const onPointerDown = (event: PointerEvent) => {
      const slot = slotRef.current;
      if (
        !slot ||
        !(event.target instanceof Node) ||
        slot.contains(event.target)
      )
        return;
      closeFlyout();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return { open, slotRef };
}

export function ToolSidebar() {
  const ready = useSelector(
    imageDocumentStore,
    (state) => state.status === "ready",
  );
  const frame = useWidgetFrame("tools");

  useEffect(() => {
    if (ready) return;
    closeFlyout();
  }, [ready]);

  useEffect(() => cancelClose, []);

  if (!ready) return null;

  return (
    <Widget.Panel
      {...frame}
      minWidth={48}
      minHeight={120}
      resizeLabel={t("resizePanel")}
      sx={styles.rail}
      data-tools=""
      role="toolbar"
      aria-label={t("tools")}
    >
      <Widget.Header label={t("dragTools")} />
      <Widget.Container align="center" gap="xxs">
        <MoveTool />
        <CreateTool />
        <EditTool />
        <ZoomTool />
      </Widget.Container>
    </Widget.Panel>
  );
}

function MoveTool() {
  const group = useSelector(toolStore, (state) => state.group);
  const { keys } = useViewport();
  return (
    <Button.Root
      sx={styles.tool}
      type="button"
      aria-label={t("moveView")}
      aria-pressed={group === "move"}
      data-pressed={group === "move" ? "" : undefined}
      title={`${t("moveView")} (${keys.pan})`}
      onClick={() => {
        closeFlyout();
        selectGroup("move");
      }}
    >
      <Button.Icon id="move" />
    </Button.Root>
  );
}

function CreateTool() {
  const group = useSelector(toolStore, (state) => state.group);
  const create = useSelector(toolStore, (state) => state.create);
  const { open, slotRef } = useFlyout("create");
  const menuId = useId();
  const option =
    CREATE_TOOL_OPTIONS.find((item) => item.id === create) ??
    CREATE_TOOL_OPTIONS[0];
  return (
    <div
      {...stylex.props(styles.slot)}
      ref={slotRef}
      onMouseLeave={() => scheduleClose("create")}
      onMouseEnter={cancelClose}
    >
      <Button.Root
        sx={styles.tool}
        type="button"
        aria-label={t(option.label)}
        aria-pressed={group === "create"}
        data-pressed={group === "create" ? "" : undefined}
        title={t(option.label)}
        onClick={() => {
          closeFlyout();
          const drawing = group === "create";
          selectGroup("create");
          if (drawing) beginLine(create);
          else ensureLine(create);
        }}
      >
        <Button.Icon id={create} />
      </Button.Root>
      <Button.Root
        sx={styles.triangle}
        type="button"
        aria-label={t("createOptions")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onMouseEnter={() => openFlyout("create")}
        onClick={(event) => {
          event.preventDefault();
          openFlyout("create");
        }}
      >
        <Button.Icon id="options">
          <span {...stylex.props(styles.triangleMark)} />
        </Button.Icon>
      </Button.Root>
      {open ? (
        <div {...stylex.props(styles.menu)}>
          <Widget.Menu
            id={menuId}
            aria-label={t("createOptions")}
            sx={styles.popup}
          >
            {CREATE_TOOLS.map((id) => (
              <CreateChoice
                key={id}
                id={id}
                checked={id === create}
                onSelect={() => {
                  selectCreate(id);
                  beginLine(id);
                  closeFlyout();
                }}
              />
            ))}
          </Widget.Menu>
        </div>
      ) : null}
    </div>
  );
}

function EditTool() {
  const group = useSelector(toolStore, (state) => state.group);
  return (
    <Button.Root
      sx={styles.tool}
      type="button"
      aria-label={t("editRoute")}
      aria-pressed={group === "edit"}
      data-pressed={group === "edit" ? "" : undefined}
      title={t("editRoute")}
      onClick={() => {
        closeFlyout();
        selectGroup("edit");
      }}
    >
      <Button.Icon id="edit" />
    </Button.Root>
  );
}

function ZoomTool() {
  const group = useSelector(toolStore, (state) => state.group);
  const zoom = useSelector(toolStore, (state) => state.zoom);
  const { actions, keys } = useViewport();
  const { open, slotRef } = useFlyout("zoom");
  const menuId = useId();
  const option =
    ZOOM_TOOL_OPTIONS.find((item) => item.id === zoom) ?? ZOOM_TOOL_OPTIONS[0];
  return (
    <div
      {...stylex.props(styles.slot)}
      ref={slotRef}
      onMouseLeave={() => scheduleClose("zoom")}
      onMouseEnter={cancelClose}
    >
      <Button.Root
        sx={styles.tool}
        type="button"
        aria-label={t(option.label)}
        aria-pressed={group === "zoom"}
        data-pressed={group === "zoom" ? "" : undefined}
        title={`${t(option.label)} (${keys[option.shortcut]})`}
        onClick={() => {
          closeFlyout();
          selectGroup("zoom");
          applyToolClick(zoom, actions, "center");
        }}
      >
        <Button.Icon id={zoom} />
      </Button.Root>
      <Button.Root
        sx={styles.triangle}
        type="button"
        aria-label={t("zoomOptions")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onMouseEnter={() => openFlyout("zoom")}
        onClick={(event) => {
          event.preventDefault();
          openFlyout("zoom");
        }}
      >
        <Button.Icon id="options">
          <span {...stylex.props(styles.triangleMark)} />
        </Button.Icon>
      </Button.Root>
      {open ? (
        <div {...stylex.props(styles.menu)}>
          <Widget.Menu
            id={menuId}
            aria-label={t("zoomOptions")}
            sx={styles.popup}
          >
            {ZOOM_TOOLS.map((id) => (
              <ZoomChoice
                key={id}
                id={id}
                keys={keys}
                checked={id === zoom}
                onSelect={() => {
                  selectZoom(id);
                  closeFlyout();
                }}
              />
            ))}
            <Layout.Box my="xs" sx={styles.rule} />
            {ZOOM_COMMANDS.map((id) => (
              <CommandChoice
                key={id}
                id={id}
                keys={keys}
                onRun={() => {
                  closeFlyout();
                  applyToolClick(id, actions, "center");
                }}
              />
            ))}
          </Widget.Menu>
        </div>
      ) : null}
    </div>
  );
}

function ZoomChoice({
  id,
  keys,
  checked,
  onSelect,
}: {
  id: ZoomToolId;
  keys: Record<ViewportKeyId, string>;
  checked: boolean;
  onSelect: () => void;
}) {
  const option = ZOOM_TOOL_OPTIONS.find((item) => item.id === id);
  if (!option) return null;
  return (
    <Button.Root
      sx={styles.item}
      type="button"
      role="option"
      aria-selected={checked}
      data-checked={checked ? "" : undefined}
      onClick={onSelect}
    >
      <Button.Icon id={id} />
      <Button.Text sx={styles.itemLabel}>{t(option.label)}</Button.Text>
      <span {...stylex.props(styles.kbd)}>{keys[option.shortcut]}</span>
    </Button.Root>
  );
}

function CommandChoice({
  id,
  keys,
  onRun,
}: {
  id: ZoomCommandId;
  keys: Record<ViewportKeyId, string>;
  onRun: () => void;
}) {
  const option = ZOOM_COMMAND_OPTIONS.find((item) => item.id === id);
  if (!option) return null;
  return (
    <Button.Root sx={styles.item} type="button" onClick={onRun}>
      <Button.Icon id={id}>
        {id === "actual-size" ? (
          <span {...stylex.props(styles.mark)}>1:1</span>
        ) : undefined}
      </Button.Icon>
      <Button.Text sx={styles.itemLabel}>{t(option.label)}</Button.Text>
      <span {...stylex.props(styles.kbd)}>{keys[option.shortcut]}</span>
    </Button.Root>
  );
}

function CreateChoice({
  id,
  checked,
  onSelect,
}: {
  id: CreateToolId;
  checked: boolean;
  onSelect: () => void;
}) {
  const option = CREATE_TOOL_OPTIONS.find((item) => item.id === id);
  if (!option) return null;
  return (
    <Button.Root
      sx={styles.item}
      type="button"
      role="option"
      aria-selected={checked}
      data-checked={checked ? "" : undefined}
      onClick={onSelect}
    >
      <Button.Icon id={id} />
      <Button.Text>{t(option.label)}</Button.Text>
    </Button.Root>
  );
}

const styles = stylex.create({
  rail: {
    zIndex: 5,
    width: 48,
    paddingBottom: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.sm,
    backgroundColor: Tokens.color.neutral[600],
  },
  slot: {
    position: "relative",
  },
  tool: {
    width: Tokens.size.xl,
    height: Tokens.size.xl,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.none,
  },
  triangle: {
    position: "absolute",
    right: 1,
    bottom: 1,
    zIndex: 1,
    width: Tokens.size.xs,
    height: Tokens.size.xs,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.none,
  },
  triangleMark: {
    width: 7,
    height: 7,
    marginRight: Tokens.spacing.xxs,
    marginBottom: Tokens.spacing.xxs,
    backgroundColor: Tokens.color.neutral[400],
    clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
  },
  menu: {
    position: "absolute",
    top: Tokens.spacing.none,
    left: "100%",
    zIndex: 30,
    marginLeft: -10,
    paddingLeft: Tokens.spacing.lg,
  },
  popup: {
    minWidth: 196,
  },
  rule: {
    height: 1,
    backgroundColor: Tokens.color.white[12],
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
      "[data-checked]": Tokens.color.blue[35],
    },
    color: {
      default: "inherit",
      ":hover": Tokens.color.neutral[0],
    },
    textAlign: "start",
  },
  itemLabel: {
    flexGrow: 1,
  },
  kbd: {
    color: Tokens.color.neutral[400],
    fontSize: 12,
    fontVariantNumeric: "tabular-nums",
  },
  mark: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
});
