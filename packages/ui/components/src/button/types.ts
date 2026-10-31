import type { ButtonProps } from "@base-ui/react/button";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties, ReactNode } from "react";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonVariant = "text" | "primary" | "secondary";

export type ButtonRootProps = Omit<ButtonProps, "className" | "style"> & {
  /** `sm` (24px), `md` (28px, default), or `lg` (32px). */
  size?: ButtonSize;
  /** Corner radius in pixels. Default 6. Overrides `rounded`. */
  radius?: number;
  /** Pill radius. */
  rounded?: boolean;
  /** `text` (default), `primary`, or `secondary`. */
  variant?: ButtonVariant;
  /** Extra StyleX styles, applied after the built-in variant and size. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

export type ButtonIconProps = {
  /**
   * Glyph name. Built-ins: `move`, `route`, `boulder`, `edit`,
   * `zoom-in`, `zoom-out`, `fit`. Also written to `data-icon`.
   */
  id: string;
  /** Replaces the built-in glyph. */
  children?: ReactNode;
  sx?: StyleXStyles;
};

export type ButtonTextProps = {
  children?: ReactNode;
  sx?: StyleXStyles;
};
