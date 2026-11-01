import type { InputProps as BaseInputProps } from "@base-ui/react/input";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

export type InputRootProps = Omit<BaseInputProps, "className" | "style"> & {
  /** Extra StyleX styles, applied after the built-in field. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};
