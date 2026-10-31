import { Button as BaseButton } from "@base-ui/react/button";
import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";
import { Tokens } from "../tokens.stylex.ts";
import { ButtonGlyph } from "./icons.tsx";
import type {
  ButtonIconProps,
  ButtonRootProps,
  ButtonTextProps,
} from "./types.ts";

/**
 * Button surface. Remaining props are passed to the underlying button
 * (`type`, `disabled`, `onClick`, `aria-*`, `ref`).
 *
 * @example
 * ```tsx
 * import { Button } from '@ui'
 *
 * <Button.Root variant="primary" type="button" onClick={save}>
 *   <Button.Icon id="route" />
 *   <Button.Text>Save</Button.Text>
 * </Button.Root>
 * ```
 */
export function ButtonRoot({
  size = "md",
  radius,
  rounded = false,
  variant = "text",
  sx,
  className,
  style,
  children,
  ref,
  ...props
}: ButtonRootProps) {
  const styled = stylex.props(
    styles.root,
    variant === "text" && styles.text,
    variant === "primary" && styles.primary,
    variant === "secondary" && styles.secondary,
    size === "sm" && styles.sm,
    size === "md" && styles.md,
    size === "lg" && styles.lg,
    rounded && styles.rounded,
    radius != null && styles.radius(radius),
    sx,
  );
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return (
    <BaseButton
      {...props}
      {...styled}
      ref={ref as Ref<HTMLElement>}
      className={mergedClass || undefined}
      style={{ ...styled.style, ...style }}
    >
      {children}
    </BaseButton>
  );
}

/**
 * Icon slot. `children` replaces the built-in glyph.
 * An unknown `id` renders nothing unless `children` is set.
 */
export function ButtonIcon({ id, children, sx }: ButtonIconProps) {
  return (
    <span {...stylex.props(styles.icon, sx)} data-icon={id} aria-hidden="true">
      {children ?? <ButtonGlyph id={id} />}
    </span>
  );
}

/** Label slot. Stays shrinkable inside the flex root. */
export function ButtonText({ children, sx }: ButtonTextProps) {
  return <span {...stylex.props(styles.label, sx)}>{children}</span>;
}

const styles = stylex.create({
  root: {
    appearance: "none",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: Tokens.spacing.md,
    borderWidth: 0,
    fontFamily: "inherit",
    fontWeight: "inherit",
    lineHeight: 1.2,
    letterSpacing: "inherit",
    whiteSpace: "nowrap",
    textAlign: "center",
    userSelect: "none",
    cursor: {
      default: "pointer",
      ":disabled": "default",
    },
    opacity: {
      default: 1,
      ":disabled": 0.45,
    },
    outlineWidth: {
      default: 0,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": Tokens.color.blue[100],
    },
    outlineOffset: 1,
    borderRadius: 6,
  },
  text: {
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[8],
      "[data-pressed]": Tokens.color.blue[35],
      '[aria-pressed="true"]': Tokens.color.blue[35],
    },
    color: "inherit",
  },
  primary: {
    backgroundColor: {
      default: Tokens.color.blue[500],
      ":hover": Tokens.color.blue[600],
    },
    color: Tokens.color.neutral[0],
    fontWeight: 650,
  },
  secondary: {
    backgroundColor: {
      default: Tokens.color.white[6],
      ":hover": Tokens.color.white[12],
    },
    color: "inherit",
  },
  sm: {
    height: Tokens.size.sm,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.md,
    fontSize: 12,
  },
  md: {
    height: Tokens.size.md,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.lg,
    fontSize: 13,
  },
  lg: {
    height: Tokens.size.lg,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.xxl,
    fontSize: 13,
  },
  rounded: {
    borderRadius: 999,
  },
  radius: (radius: number) => ({
    borderRadius: radius,
  }),
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 0,
    flexShrink: 0,
    lineHeight: 0,
  },
  label: {
    minWidth: 0,
  },
});
