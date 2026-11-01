import { Toast as BaseToast } from "@base-ui/react/toast";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { TbAlertTriangle, TbInfoCircle } from "react-icons/tb";
import { Tokens } from "../tokens.stylex.ts";
import type {
  ToastActionProps,
  ToastArrowProps,
  ToastCloseProps,
  ToastContentProps,
  ToastDescriptionProps,
  ToastIconProps,
  ToastPortalProps,
  ToastPositionerProps,
  ToastRootProps,
  ToastTitleProps,
  ToastViewportProps,
} from "./types.ts";

export const ToastProvider = BaseToast.Provider;

/** Moves the viewport to the end of `document.body`. */
export function ToastPortal({
  sx,
  className,
  style,
  ...props
}: ToastPortalProps) {
  const chrome = toastChrome(stylex.props(sx), className, style);

  return <BaseToast.Portal {...props} {...chrome} />;
}

/**
 * Fixed stack in the bottom-right corner. Pass `sx` to move it.
 * `aria-label` names the list.
 */
export function ToastViewport({
  sx,
  className,
  style,
  ...props
}: ToastViewportProps) {
  const chrome = toastChrome(
    stylex.props(styles.viewport, sx),
    className,
    style,
  );

  return <BaseToast.Viewport {...props} {...chrome} />;
}

/** One toast. Pass the object from `useToastManager()`. */
export function ToastRoot({ sx, className, style, ...props }: ToastRootProps) {
  const chrome = toastChrome(stylex.props(styles.toast, sx), className, style);

  return <BaseToast.Root {...props} {...chrome} />;
}

/** Column body. Place `Title`, `Close`, and `Description` inside it. */
export function ToastContent({
  sx,
  className,
  style,
  ...props
}: ToastContentProps) {
  const chrome = toastChrome(
    stylex.props(styles.content, sx),
    className,
    style,
  );

  return <BaseToast.Content {...props} {...chrome} />;
}

/** Mark for the toast type. `warning` is the alert glyph. Other types use info. */
export function ToastIcon({ type, sx, className, style }: ToastIconProps) {
  const Glyph = type === "warning" ? TbAlertTriangle : TbInfoCircle;
  const chrome = toastChrome(stylex.props(styles.icon, sx), className, style);

  return (
    <span {...chrome} data-type={type} aria-hidden="true">
      <Glyph {...iconGlyph} />
    </span>
  );
}

/** Title. Renders the toast's `title` when children are omitted. */
export function ToastTitle({
  sx,
  className,
  style,
  ...props
}: ToastTitleProps) {
  const chrome = toastChrome(stylex.props(styles.title, sx), className, style);

  return <BaseToast.Title {...props} {...chrome} />;
}

/** Body text. Renders the toast's `description` when children are omitted. */
export function ToastDescription({
  sx,
  className,
  style,
  ...props
}: ToastDescriptionProps) {
  const chrome = toastChrome(
    stylex.props(styles.description, sx),
    className,
    style,
  );

  return <BaseToast.Description {...props} {...chrome} />;
}

/** Dismiss button. Children are the label. */
export function ToastClose({
  sx,
  className,
  style,
  ...props
}: ToastCloseProps) {
  const chrome = toastChrome(stylex.props(styles.close, sx), className, style);

  return <BaseToast.Close {...props} {...chrome} />;
}

/** Action button. */
export function ToastAction({
  sx,
  className,
  style,
  ...props
}: ToastActionProps) {
  const chrome = toastChrome(stylex.props(styles.action, sx), className, style);

  return <BaseToast.Action {...props} {...chrome} />;
}

/** Anchors one toast to an element. */
export function ToastPositioner({
  sx,
  className,
  style,
  ...props
}: ToastPositionerProps) {
  const chrome = toastChrome(stylex.props(sx), className, style);

  return <BaseToast.Positioner {...props} {...chrome} />;
}

/** Arrow for an anchored toast. */
export function ToastArrow({
  sx,
  className,
  style,
  ...props
}: ToastArrowProps) {
  const chrome = toastChrome(stylex.props(styles.arrow, sx), className, style);

  return <BaseToast.Arrow {...props} {...chrome} />;
}

function toastChrome(
  styled: ReturnType<typeof stylex.props>,
  className?: string,
  style?: CSSProperties,
) {
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return {
    className: mergedClass || undefined,
    style: { ...styled.style, ...style },
  };
}

const styles = stylex.create({
  viewport: {
    position: "fixed",
    right: Tokens.spacing.xxxl,
    bottom: Tokens.spacing.xxxl,
    zIndex: 40,
    display: "flex",
    flexDirection: "column",
    gap: Tokens.spacing.md,
    width: "min(360px, calc(100vw - 32px))",
    margin: Tokens.spacing.none,
    padding: Tokens.spacing.none,
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
    outlineOffset: 2,
    pointerEvents: "none",
  },
  toast: {
    width: "100%",
    pointerEvents: "auto",
    backgroundColor: {
      default: Tokens.color.neutral[750],
      '[data-type="warning"]': `color-mix(in srgb, ${Tokens.color.yellow[300]} 22%, ${Tokens.color.neutral[750]})`,
    },
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: Tokens.color.neutral[950],
      '[data-type="warning"]': Tokens.color.yellow[500],
    },
    borderRadius: 6,
    boxShadow: `0 12px 28px ${Tokens.color.black[45]}`,
    opacity: {
      default: 1,
      "[data-starting-style]": 0,
      "[data-ending-style]": 0,
    },
    transform: {
      default: "translateY(0)",
      "[data-starting-style]": "translateY(8px)",
      "[data-ending-style]": "translateY(8px)",
    },
    transitionProperty: "opacity, transform",
    transitionDuration: {
      default: "180ms",
      [Tokens.media.reduceMotion]: "0s",
    },
    transitionTimingFunction: "ease",
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
    outlineOffset: 2,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: Tokens.spacing.sm,
    padding: Tokens.spacing.xl,
  },
  title: {
    margin: Tokens.spacing.none,
    fontSize: 14,
    fontWeight: 650,
    lineHeight: 1.3,
  },
  description: {
    margin: Tokens.spacing.none,
    fontSize: 13,
    lineHeight: 1.4,
    color: {
      default: Tokens.color.neutral[400],
      '[data-type="warning"]': Tokens.color.yellow[100],
    },
  },
  close: {
    appearance: "none",
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: 0,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[8],
    },
    color: "inherit",
    height: Tokens.size.md,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.lg,
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
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
  },
  action: {
    appearance: "none",
    borderWidth: 0,
    backgroundColor: {
      default: Tokens.color.blue[500],
      ":hover": Tokens.color.blue[600],
      '[data-type="warning"]': Tokens.color.yellow[300],
      '[data-type="warning"]:hover': Tokens.color.yellow[500],
    },
    color: {
      default: Tokens.color.neutral[0],
      '[data-type="warning"]': Tokens.color.neutral[1000],
    },
    height: Tokens.size.md,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.lg,
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 650,
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
  },
  icon: {
    display: "inline-flex",
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 1,
    color: {
      default: Tokens.color.neutral[400],
      '[data-type="warning"]': Tokens.color.yellow[300],
    },
  },
  glyph: {
    width: 20,
    height: 20,
    display: "block",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  arrow: {
    display: "block",
    width: Tokens.spacing.md,
    height: Tokens.spacing.md,
    backgroundColor: Tokens.color.neutral[750],
  },
});

const iconGlyph = {
  ...stylex.props(styles.glyph),
  "aria-hidden": true as const,
};
