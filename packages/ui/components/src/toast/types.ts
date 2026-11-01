import type {
  ToastActionProps as BaseToastActionProps,
  ToastArrowProps as BaseToastArrowProps,
  ToastCloseProps as BaseToastCloseProps,
  ToastContentProps as BaseToastContentProps,
  ToastDescriptionProps as BaseToastDescriptionProps,
  ToastPortalProps as BaseToastPortalProps,
  ToastPositionerProps as BaseToastPositionerProps,
  ToastProviderProps as BaseToastProviderProps,
  ToastRootProps as BaseToastRootProps,
  ToastTitleProps as BaseToastTitleProps,
  ToastViewportProps as BaseToastViewportProps,
} from "@base-ui/react/toast";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

type ToastChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

type WithChrome<T> = Omit<T, "className" | "style"> & ToastChrome;

export type ToastProviderProps = BaseToastProviderProps;
export type ToastPortalProps = WithChrome<BaseToastPortalProps>;
export type ToastViewportProps = WithChrome<BaseToastViewportProps>;
export type ToastRootProps = WithChrome<BaseToastRootProps>;
export type ToastContentProps = WithChrome<BaseToastContentProps>;
export type ToastTitleProps = WithChrome<BaseToastTitleProps>;
export type ToastDescriptionProps = WithChrome<BaseToastDescriptionProps>;
export type ToastCloseProps = WithChrome<BaseToastCloseProps>;
export type ToastActionProps = WithChrome<BaseToastActionProps>;
export type ToastPositionerProps = WithChrome<BaseToastPositionerProps>;
export type ToastArrowProps = WithChrome<BaseToastArrowProps>;
