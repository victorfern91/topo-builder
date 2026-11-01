import type { ToggleProps as BaseToggleProps } from "@base-ui/react/toggle";
import type { ToggleGroupProps } from "@base-ui/react/toggle-group";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

type ToggleChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

/** Group of toggle options. `value` lists the pressed option values. */
export type ToggleRootProps<Value extends string = string> = Omit<
  ToggleGroupProps<Value>,
  "className" | "style"
> &
  ToggleChrome;

/** One choice in a toggle group. `value` identifies the option. */
export type ToggleOptionProps<Value extends string = string> = Omit<
  BaseToggleProps<Value>,
  "className" | "style"
> &
  ToggleChrome;
