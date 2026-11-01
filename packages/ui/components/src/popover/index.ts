import {
  PopoverClose,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from "./popover.tsx";

/**
 * Popup anchored to a button. Compose `Root`, `Trigger`, `Portal`,
 * `Positioner`, `Popup`, `Title`, and `Close`.
 */
export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Positioner: PopoverPositioner,
  Popup: PopoverPopup,
  Title: PopoverTitle,
  Close: PopoverClose,
};

export default Popover;

export type {
  PopoverCloseProps,
  PopoverPopupProps,
  PopoverPortalProps,
  PopoverPositionerProps,
  PopoverRootProps,
  PopoverTitleProps,
  PopoverTriggerProps,
} from "./types.ts";
