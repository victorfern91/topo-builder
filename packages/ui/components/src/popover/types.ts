import type {
  PopoverCloseProps as BasePopoverCloseProps,
  PopoverPopupProps as BasePopoverPopupProps,
  PopoverPortalProps as BasePopoverPortalProps,
  PopoverPositionerProps as BasePopoverPositionerProps,
  PopoverRootProps as BasePopoverRootProps,
  PopoverTitleProps as BasePopoverTitleProps,
  PopoverTriggerProps as BasePopoverTriggerProps,
} from "@base-ui/react/popover";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

type PopoverChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

type WithChrome<T> = Omit<T, "className" | "style"> & PopoverChrome;

export type PopoverRootProps<Payload = unknown> = BasePopoverRootProps<Payload>;
export type PopoverTriggerProps<Payload = unknown> = WithChrome<
  BasePopoverTriggerProps<Payload>
>;
export type PopoverPortalProps = WithChrome<BasePopoverPortalProps>;
export type PopoverPositionerProps = WithChrome<BasePopoverPositionerProps>;
export type PopoverPopupProps = WithChrome<BasePopoverPopupProps>;
export type PopoverTitleProps = WithChrome<BasePopoverTitleProps>;
export type PopoverCloseProps = WithChrome<BasePopoverCloseProps>;
