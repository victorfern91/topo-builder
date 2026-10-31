import type {
  SliderControlProps as BaseSliderControlProps,
  SliderIndicatorProps as BaseSliderIndicatorProps,
  SliderLabelProps as BaseSliderLabelProps,
  SliderRootProps as BaseSliderRootProps,
  SliderThumbProps as BaseSliderThumbProps,
  SliderTrackProps as BaseSliderTrackProps,
  SliderValueProps as BaseSliderValueProps,
} from "@base-ui/react/slider";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

type SliderChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

export type SliderRootProps<Value extends number | readonly number[] = number> =
  Omit<BaseSliderRootProps<Value>, "className" | "style"> & SliderChrome;

export type SliderLabelProps = Omit<
  BaseSliderLabelProps,
  "className" | "style"
> &
  SliderChrome;

export type SliderValueProps = Omit<
  BaseSliderValueProps,
  "className" | "style"
> &
  SliderChrome;

export type SliderControlProps = Omit<
  BaseSliderControlProps,
  "className" | "style"
> &
  SliderChrome;

export type SliderTrackProps = Omit<
  BaseSliderTrackProps,
  "className" | "style"
> &
  SliderChrome;

export type SliderIndicatorProps = Omit<
  BaseSliderIndicatorProps,
  "className" | "style"
> &
  SliderChrome;

export type SliderThumbProps = Omit<
  BaseSliderThumbProps,
  "className" | "style"
> &
  SliderChrome;
