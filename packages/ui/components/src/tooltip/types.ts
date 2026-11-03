import type {
  TooltipPopupProps as BaseTooltipPopupProps,
  TooltipPortalProps as BaseTooltipPortalProps,
  TooltipPositionerProps as BaseTooltipPositionerProps,
  TooltipProviderProps as BaseTooltipProviderProps,
  TooltipRootProps as BaseTooltipRootProps,
  TooltipTriggerProps as BaseTooltipTriggerProps,
} from "@base-ui/react/tooltip";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties, ReactElement, ReactNode } from "react";

type TooltipChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

type WithChrome<T> = Omit<T, "className" | "style"> & TooltipChrome;

export type TooltipProviderProps = BaseTooltipProviderProps;
export type TooltipRootProps<Payload = unknown> = BaseTooltipRootProps<Payload>;
export type TooltipTriggerProps<Payload = unknown> = WithChrome<
  BaseTooltipTriggerProps<Payload>
>;
export type TooltipPortalProps = WithChrome<BaseTooltipPortalProps>;
export type TooltipPositionerProps = WithChrome<BaseTooltipPositionerProps>;
export type TooltipPopupProps = WithChrome<BaseTooltipPopupProps>;

export type TooltipHintProps = {
  /** Text shown in the popup. */
  label: ReactNode;
  /**
   * Control that shows the hint.
   * Must be a single element that accepts a ref (for example `Button.Root`).
   */
  children: ReactElement;
  /** Gap between the trigger and the popup, in pixels. Default 6. */
  sideOffset?: number;
};
