import type { MessageId } from "../../i18n/messages.ts";
import type { ShortcutId } from "../../shortcuts.ts";
import type {
  MenuActionId,
  MenuActionValue,
  MenuBindingId,
  MenuBindingValue,
  MenuConditionId,
  MenuWidgetId,
} from "./registry.ts";

/** A message id from `messages.ts`, or `{ text }` for text that is not translated. */
export type MenuLabel = MessageId | { text: string };

type Shared = {
  /** Hides the entry while the condition is false. */
  visibleWhen?: MenuConditionId;
};

/** `value` is required when the action takes one and absent otherwise. */
export type ItemEntry = {
  [A in MenuActionId]: Shared & {
    type: "item";
    label: MenuLabel;
    action: A;
    /** Muted text after the label. `shortcut` wins when both are set. */
    hint?: string;
    shortcut?: ShortcutId;
    enabledWhen?: MenuConditionId;
  } & (undefined extends MenuActionValue<A>
      ? { value?: undefined }
      : { value: MenuActionValue<A> });
}[MenuActionId];

export type SeparatorEntry = Shared & { type: "separator" };

export type WidgetEntry = Shared & { type: "widget"; widget: MenuWidgetId };

export type RadioEntry = {
  [B in MenuBindingId]: Shared & {
    type: "radio";
    label?: MenuLabel;
    binding: B;
    options: { value: MenuBindingValue<B>; label: MenuLabel }[];
  };
}[MenuBindingId];

export type SubmenuEntry = Shared & {
  type: "submenu";
  label: MenuLabel;
  enabledWhen?: MenuConditionId;
  /** While `when` is true the row is disabled and shows `label`. */
  busy?: { when: MenuConditionId; label: MenuLabel };
  items: MenuEntry[];
};

export type MenuEntry =
  ItemEntry | SeparatorEntry | WidgetEntry | RadioEntry | SubmenuEntry;

export type TopMenuConfig = {
  menus: { id: string; label: MenuLabel; items: MenuEntry[] }[];
};

/**
 * The menubar. Each name (`action`, `enabledWhen`, `visibleWhen`, `busy.when`,
 * `binding`, `widget`) resolves through `registry.ts`.
 */
export const topMenu: TopMenuConfig = {
  menus: [
    {
      id: "file",
      label: "file",
      items: [
        {
          type: "item",
          label: "openEllipsis",
          action: "openImage",
          shortcut: "open",
        },
        {
          type: "submenu",
          label: "exportMenu",
          enabledWhen: "documentReady",
          busy: { when: "exporting", label: "exporting" },
          items: [
            {
              type: "item",
              label: { text: "PNG" },
              hint: ".png",
              action: "export",
              value: "png",
            },
            {
              type: "item",
              label: { text: "JPEG" },
              hint: ".jpg",
              action: "export",
              value: "jpeg",
            },
            {
              type: "item",
              label: { text: "TIFF" },
              hint: ".tif",
              action: "export",
              value: "tiff",
            },
            {
              type: "item",
              label: { text: "SVG" },
              hint: ".svg",
              action: "export",
              value: "svg",
            },
            {
              type: "item",
              label: "topoFormat",
              hint: ".topo",
              action: "export",
              value: "topo",
            },
          ],
        },
      ],
    },
    {
      id: "edit",
      label: "edit",
      items: [
        {
          type: "item",
          label: "undo",
          action: "undo",
          enabledWhen: "canUndo",
          shortcut: "undo",
        },
        {
          type: "item",
          label: "redo",
          action: "redo",
          enabledWhen: "canRedo",
          shortcut: "redo",
        },
      ],
    },
    {
      id: "view",
      label: "view",
      items: [
        { type: "widget", widget: "scaleSlider", visibleWhen: "documentReady" },
        { type: "separator", visibleWhen: "documentReady" },
        {
          type: "radio",
          label: "gradeSystem",
          binding: "gradeSystem",
          options: [
            { value: "french", label: "frenchGrade" },
            { value: "yds", label: "americanGrade" },
          ],
        },
      ],
    },
  ],
};
