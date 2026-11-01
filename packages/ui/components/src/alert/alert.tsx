import { AlertDialog } from "@base-ui/react/alert-dialog";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { Tokens } from "../tokens.stylex.ts";
import type {
  AlertBackdropProps,
  AlertCloseProps,
  AlertDescriptionProps,
  AlertPopupProps,
  AlertPortalProps,
  AlertRootProps,
  AlertTitleProps,
} from "./types.ts";

/**
 * Modal that stays open until a close button is pressed.
 * Compose `Portal`, `Backdrop`, `Popup`, `Title`, `Description`, and `Close`.
 *
 * @example
 * ```tsx
 * import { Alert } from '@ui'
 *
 * <Alert.Root open={open} onOpenChange={setOpen}>
 *   <Alert.Portal>
 *     <Alert.Backdrop />
 *     <Alert.Popup>
 *       <Alert.Title>Unsaved changes</Alert.Title>
 *       <Alert.Description>Reloading discards the drawing on this page.</Alert.Description>
 *       <Alert.Close>Stay</Alert.Close>
 *       <Alert.Close tone="warning">Reload</Alert.Close>
 *     </Alert.Popup>
 *   </Alert.Portal>
 * </Alert.Root>
 * ```
 */
export function AlertRoot({ children, ...props }: AlertRootProps) {
  return <AlertDialog.Root {...props}>{children}</AlertDialog.Root>;
}

/** Moves the dialog to the end of `document.body`. */
export function AlertPortal({
  sx,
  className,
  style,
  ...props
}: AlertPortalProps) {
  const chrome = alertChrome(stylex.props(sx), className, style);

  return <AlertDialog.Portal {...props} {...chrome} />;
}

/** Dims the page behind the popup. */
export function AlertBackdrop({
  sx,
  className,
  style,
  ...props
}: AlertBackdropProps) {
  const chrome = alertChrome(
    stylex.props(styles.backdrop, sx),
    className,
    style,
  );

  return <AlertDialog.Backdrop {...props} {...chrome} />;
}

/** Dialog surface. Place the title, description, and close buttons inside it. */
export function AlertPopup({
  sx,
  className,
  style,
  ...props
}: AlertPopupProps) {
  const chrome = alertChrome(stylex.props(styles.popup, sx), className, style);

  return <AlertDialog.Popup {...props} {...chrome} />;
}

/** Heading. */
export function AlertTitle({
  sx,
  className,
  style,
  ...props
}: AlertTitleProps) {
  const chrome = alertChrome(stylex.props(styles.title, sx), className, style);

  return <AlertDialog.Title {...props} {...chrome} />;
}

/** Supporting text. */
export function AlertDescription({
  sx,
  className,
  style,
  ...props
}: AlertDescriptionProps) {
  const chrome = alertChrome(
    stylex.props(styles.description, sx),
    className,
    style,
  );

  return <AlertDialog.Description {...props} {...chrome} />;
}

/**
 * Closes the dialog. `tone` is `quiet` (default) or `warning`.
 * Children are the label.
 */
export function AlertClose({
  tone = "quiet",
  sx,
  className,
  style,
  ...props
}: AlertCloseProps) {
  const chrome = alertChrome(
    stylex.props(
      styles.close,
      tone === "quiet" && styles.quiet,
      tone === "warning" && styles.warning,
      sx,
    ),
    className,
    style,
  );

  return <AlertDialog.Close {...props} {...chrome} />;
}

function alertChrome(
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
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    backgroundColor: Tokens.color.black[55],
    opacity: {
      default: 1,
      "[data-starting-style]": 0,
      "[data-ending-style]": 0,
    },
    transitionProperty: "opacity",
    transitionDuration: {
      default: "180ms",
      [Tokens.media.reduceMotion]: "0s",
    },
    transitionTimingFunction: "ease",
  },
  popup: {
    position: "fixed",
    top: "50%",
    left: "50%",
    zIndex: 51,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: Tokens.spacing.xl,
    width: "min(420px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 32px)",
    margin: Tokens.spacing.none,
    padding: Tokens.spacing.xxxxl,
    overflow: "auto",
    backgroundColor: Tokens.color.neutral[750],
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 6,
    boxShadow: `0 12px 28px ${Tokens.color.black[45]}`,
    opacity: {
      default: 1,
      "[data-starting-style]": 0,
      "[data-ending-style]": 0,
    },
    transform: {
      default: "translate(-50%, -50%)",
      "[data-starting-style]": "translate(-50%, calc(-50% + 8px))",
      "[data-ending-style]": "translate(-50%, calc(-50% + 8px))",
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
    color: Tokens.color.neutral[400],
  },
  close: {
    appearance: "none",
    alignSelf: "end",
    borderWidth: 0,
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
  quiet: {
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[8],
    },
    color: "inherit",
    fontWeight: 400,
  },
  warning: {
    backgroundColor: {
      default: Tokens.color.orange[500],
      ":hover": Tokens.color.orange[600],
    },
    color: Tokens.color.neutral[0],
    fontWeight: 650,
  },
});
