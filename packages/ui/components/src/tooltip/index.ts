import {
  TooltipHint,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from "./tooltip.tsx";

/**
 * Hint on hover or focus. Compose `Provider`, `Root`, `Trigger`,
 * `Portal`, `Positioner`, and `Popup`. `Hint` wraps one control.
 */
export const Tooltip = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Portal: TooltipPortal,
  Positioner: TooltipPositioner,
  Popup: TooltipPopup,
  Hint: TooltipHint,
};

export default Tooltip;

export type {
  TooltipHintProps,
  TooltipPopupProps,
  TooltipPortalProps,
  TooltipPositionerProps,
  TooltipProviderProps,
  TooltipRootProps,
  TooltipTriggerProps,
} from "./types.ts";
