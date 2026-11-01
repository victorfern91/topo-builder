import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectSwatch,
  SelectTrigger,
  SelectValue,
} from "./select.tsx";

/**
 * Dropdown. Compose `Root`, `Trigger`, `Value`, `Icon`, `Portal`,
 * `Positioner`, `Popup`, `List`, `Item`, `ItemIndicator`, `Swatch`,
 * and `ItemText`.
 */
export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Icon: SelectIcon,
  Portal: SelectPortal,
  Positioner: SelectPositioner,
  Popup: SelectPopup,
  List: SelectList,
  Item: SelectItem,
  ItemIndicator: SelectItemIndicator,
  Swatch: SelectSwatch,
  ItemText: SelectItemText,
};

export default Select;

export type {
  SelectIconProps,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectListProps,
  SelectPopupProps,
  SelectPortalProps,
  SelectPositionerProps,
  SelectRootProps,
  SelectSwatchProps,
  SelectTriggerProps,
  SelectValueProps,
} from "./types.ts";
