import type { MenubarProps as BaseMenubarProps } from "@base-ui/react/menubar";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

export type MenubarRootProps = Omit<BaseMenubarProps, "className" | "style"> & {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};
