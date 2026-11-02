import {
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuRoot,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from "./menu.tsx";

/**
 * Menu anchored to a button. Compose `Root`, `Trigger`, `Portal`,
 * `Positioner`, `Popup`, `Item`, `Separator`, `SubmenuRoot`, and
 * `SubmenuTrigger`. `Group` and `GroupLabel` name a set of rows.
 * `RadioGroup`, `RadioItem`, and `RadioItemIndicator` pick one value.
 */
export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Portal: MenuPortal,
  Positioner: MenuPositioner,
  Popup: MenuPopup,
  Item: MenuItem,
  Separator: MenuSeparator,
  SubmenuRoot: MenuSubmenuRoot,
  SubmenuTrigger: MenuSubmenuTrigger,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  RadioItemIndicator: MenuRadioItemIndicator,
};

export default Menu;

export type {
  MenuGroupLabelProps,
  MenuGroupProps,
  MenuItemProps,
  MenuPopupProps,
  MenuPortalProps,
  MenuPositionerProps,
  MenuRadioGroupProps,
  MenuRadioItemIndicatorProps,
  MenuRadioItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuSubmenuRootProps,
  MenuSubmenuTriggerProps,
  MenuTriggerProps,
} from "./types.ts";
