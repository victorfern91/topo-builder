import type { MessageId } from "../i18n/messages.ts";
import type {
  CreateToolId,
  ToolGroupId,
  ZoomCommandId,
  ZoomToolId,
} from "../state/tools.ts";
import type { ShortcutId } from "../shortcuts.ts";

export type ToolOption<Id extends string> = {
  id: Id;
  label: MessageId;
  shortcut?: ShortcutId;
};

/** Selects a tool group on click. */
type GroupTool = {
  kind: "group";
  id: "move" | "edit";
  group: ToolGroupId;
  label: MessageId;
  icon: string;
  shortcut?: ShortcutId;
};

/** Draws the chosen line type. The corner triangle opens the type list on hover. */
type CreateTool = {
  kind: "create";
  id: "create";
  menuLabel: MessageId;
  options: readonly ToolOption<CreateToolId>[];
};

/** Zooms with the chosen tool. The corner triangle opens tools and commands on hover. */
type ZoomTool = {
  kind: "zoom";
  id: "zoom";
  menuLabel: MessageId;
  options: readonly ToolOption<ZoomToolId>[];
  commands: readonly ToolOption<ZoomCommandId>[];
};

/** Opens a panel of controls while the pointer is over the button. */
type PanelTool = {
  kind: "panel";
  id: "scale";
  label: MessageId;
  icon: string;
  minWidth: number;
};

export type SidebarTool = GroupTool | CreateTool | ZoomTool | PanelTool;

export type SidebarToolId = SidebarTool["id"];

export type PanelId = PanelTool["id"];

/** Rail items, top to bottom. */
export const SIDEBAR_TOOLS: readonly SidebarTool[] = [
  {
    kind: "group",
    id: "edit",
    group: "edit",
    label: "editRoute",
    icon: "edit",
  },
  {
    kind: "group",
    id: "move",
    group: "move",
    label: "moveView",
    icon: "move",
    shortcut: "pan",
  },
  {
    kind: "create",
    id: "create",
    menuLabel: "createOptions",
    options: [
      { id: "route", label: "createRoute" },
      { id: "boulder", label: "createBoulder" },
    ],
  },
  {
    kind: "zoom",
    id: "zoom",
    menuLabel: "zoomOptions",
    options: [
      { id: "zoom-in", label: "zoomIn", shortcut: "zoom-in" },
      { id: "zoom-out", label: "zoomOut", shortcut: "zoom-out" },
    ],
    commands: [
      { id: "fit", label: "fitWindow", shortcut: "fit" },
      { id: "actual-size", label: "actualSize", shortcut: "actual-size" },
    ],
  },
  {
    kind: "panel",
    id: "scale",
    label: "scale",
    icon: "scale",
    minWidth: 260,
  },
];
