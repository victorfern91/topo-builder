import * as stylex from "@stylexjs/stylex";
import { Button, Layout, Tokens, Widget } from "@ui";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import {
  useEffect,
  useId,
  useRef,
  type ComponentType,
  type MouseEvent,
} from "react";
import { t } from "../i18n/index.ts";
import { imageDocumentStore } from "../state/image-document.ts";
import { beginLine, ensureLine } from "../state/lines.ts";
import {
  applyToolClick,
  selectCreate,
  selectGroup,
  selectZoom,
  toolStore,
} from "../state/tools.ts";
import { useViewport, useWidgetFrame } from "../state/use-viewport.ts";
import { titleWithShortcut } from "../shortcuts.ts";
import { ScaleSlider } from "./scale-slider.tsx";
import { Shortcut } from "./shortcut.tsx";
import {
  SIDEBAR_TOOLS,
  type PanelId,
  type SidebarTool,
  type SidebarToolId,
  type ToolOption,
} from "./tool-sidebar.config.ts";

const PANELS: Record<PanelId, ComponentType> = {
  scale: ScaleSlider,
};

const flyoutStore = new Store<SidebarToolId | null>(null);
let closeTimer: number | null = null;

function cancelClose(): void {
  if (closeTimer != null) window.clearTimeout(closeTimer);
  closeTimer = null;
}

function closeFlyout(): void {
  cancelClose();
  flyoutStore.setState((current) => (current === null ? current : null));
}

function openFlyout(id: SidebarToolId): void {
  cancelClose();
  flyoutStore.setState((current) => (current === id ? current : id));
}

function scheduleClose(id: SidebarToolId): void {
  cancelClose();
  closeTimer = window.setTimeout(() => {
    closeTimer = null;
    flyoutStore.setState((current) => (current === id ? null : current));
  }, 160);
}

/**
 * Open state and slot props for one rail flyout. Leaving the slot closes it,
 * but not while a button is held, so a slider drag can leave the popup.
 */
function useFlyout(id: SidebarToolId) {
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
    const onPointerUp = () => {
      const slot = slotRef.current;
      if (slot && !slot.matches(":hover")) scheduleClose(id);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [id, open]);

  const slotProps = {
    ref: slotRef,
    onMouseEnter: cancelClose,
    onMouseLeave: (event: MouseEvent) => {
      if (event.buttons === 0) scheduleClose(id);
    },
    ...stylex.props(styles.slot),
  };

  return { open, slotProps };
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
        {SIDEBAR_TOOLS.map((tool) => (
          <SidebarItem key={tool.id} tool={tool} />
        ))}
      </Widget.Container>
    </Widget.Panel>
  );
}

function SidebarItem({ tool }: { tool: SidebarTool }) {
  switch (tool.kind) {
    case "group":
      return <GroupTool tool={tool} />;
    case "create":
      return <CreateTool tool={tool} />;
    case "zoom":
      return <ZoomTool tool={tool} />;
    case "panel":
      return <PanelTool tool={tool} />;
  }
}

function GroupTool({
  tool,
}: {
  tool: Extract<SidebarTool, { kind: "group" }>;
}) {
  const pressed = useSelector(toolStore, (state) => state.group === tool.group);
  const label = t(tool.label);
  return (
    <Button.Root
      sx={styles.tool}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-pressed={pressed ? "" : undefined}
      title={titleWithShortcut(label, tool.shortcut)}
      onClick={() => {
        closeFlyout();
        selectGroup(tool.group);
      }}
    >
      <Button.Icon id={tool.icon} />
    </Button.Root>
  );
}

function CreateTool({
  tool,
}: {
  tool: Extract<SidebarTool, { kind: "create" }>;
}) {
  const group = useSelector(toolStore, (state) => state.group);
  const create = useSelector(toolStore, (state) => state.create);
  const { open, slotProps } = useFlyout(tool.id);
  const menuId = useId();
  const option =
    tool.options.find((item) => item.id === create) ?? tool.options[0];
  return (
    <div {...slotProps}>
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
      <OptionsTriangle
        id={tool.id}
        label={t(tool.menuLabel)}
        menuId={menuId}
        open={open}
      />
      {open ? (
        <div {...stylex.props(styles.menu)}>
          <Widget.Menu
            id={menuId}
            aria-label={t(tool.menuLabel)}
            sx={styles.popup}
          >
            {tool.options.map((item) => (
              <Choice
                key={item.id}
                option={item}
                checked={item.id === create}
                onSelect={() => {
                  selectCreate(item.id);
                  beginLine(item.id);
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

function ZoomTool({ tool }: { tool: Extract<SidebarTool, { kind: "zoom" }> }) {
  const group = useSelector(toolStore, (state) => state.group);
  const zoom = useSelector(toolStore, (state) => state.zoom);
  const { actions } = useViewport();
  const { open, slotProps } = useFlyout(tool.id);
  const menuId = useId();
  const option =
    tool.options.find((item) => item.id === zoom) ?? tool.options[0];
  const label = t(option.label);
  return (
    <div {...slotProps}>
      <Button.Root
        sx={styles.tool}
        type="button"
        aria-label={label}
        aria-pressed={group === "zoom"}
        data-pressed={group === "zoom" ? "" : undefined}
        title={titleWithShortcut(label, option.shortcut)}
        onClick={() => {
          closeFlyout();
          selectGroup("zoom");
          applyToolClick(zoom, actions, "center");
        }}
      >
        <Button.Icon id={zoom} />
      </Button.Root>
      <OptionsTriangle
        id={tool.id}
        label={t(tool.menuLabel)}
        menuId={menuId}
        open={open}
      />
      {open ? (
        <div {...stylex.props(styles.menu)}>
          <Widget.Menu
            id={menuId}
            aria-label={t(tool.menuLabel)}
            sx={styles.popup}
          >
            {tool.options.map((item) => (
              <Choice
                key={item.id}
                option={item}
                checked={item.id === zoom}
                onSelect={() => {
                  selectZoom(item.id);
                  closeFlyout();
                }}
              />
            ))}
            <Layout.Box my="xs" sx={styles.rule} />
            {tool.commands.map((item) => (
              <Choice
                key={item.id}
                option={item}
                onSelect={() => {
                  closeFlyout();
                  applyToolClick(item.id, actions, "center");
                }}
              />
            ))}
          </Widget.Menu>
        </div>
      ) : null}
    </div>
  );
}

function PanelTool({
  tool,
}: {
  tool: Extract<SidebarTool, { kind: "panel" }>;
}) {
  const { open, slotProps } = useFlyout(tool.id);
  const menuId = useId();
  const Panel = PANELS[tool.id];
  const label = t(tool.label);
  return (
    <div {...slotProps}>
      <Button.Root
        sx={styles.tool}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        data-pressed={open ? "" : undefined}
        title={label}
        onMouseEnter={() => openFlyout(tool.id)}
        onClick={() => openFlyout(tool.id)}
      >
        <Button.Icon id={tool.icon} />
      </Button.Root>
      {open ? (
        <div {...stylex.props(styles.menu)}>
          <Widget.Menu
            id={menuId}
            role="dialog"
            aria-label={label}
            style={{ minWidth: tool.minWidth }}
          >
            <Panel />
          </Widget.Menu>
        </div>
      ) : null}
    </div>
  );
}

function OptionsTriangle({
  id,
  label,
  menuId,
  open,
}: {
  id: SidebarToolId;
  label: string;
  menuId: string;
  open: boolean;
}) {
  return (
    <Button.Root
      sx={styles.triangle}
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      onMouseEnter={() => openFlyout(id)}
      onClick={(event) => {
        event.preventDefault();
        openFlyout(id);
      }}
    >
      <Button.Icon id="options">
        <span {...stylex.props(styles.triangleMark)} />
      </Button.Icon>
    </Button.Root>
  );
}

function Choice<Id extends string>({
  option,
  checked,
  onSelect,
}: {
  option: ToolOption<Id>;
  checked?: boolean;
  onSelect: () => void;
}) {
  const selectable = checked !== undefined;
  return (
    <Button.Root
      sx={styles.item}
      type="button"
      role={selectable ? "option" : undefined}
      aria-selected={selectable ? checked : undefined}
      data-checked={checked ? "" : undefined}
      onClick={onSelect}
    >
      <Button.Icon id={option.id}>
        {option.id === "actual-size" ? (
          <span {...stylex.props(styles.mark)}>1:1</span>
        ) : undefined}
      </Button.Icon>
      <Button.Text sx={styles.itemLabel}>{t(option.label)}</Button.Text>
      {option.shortcut ? (
        <Shortcut id={option.shortcut} sx={styles.kbd} />
      ) : null}
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
    color: {
      default: Tokens.color.neutral[400],
      [stylex.when.ancestor(":hover")]: "inherit",
    },
  },
  mark: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
});
