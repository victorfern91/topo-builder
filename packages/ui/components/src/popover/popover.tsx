import { Popover as BasePopover } from "@base-ui/react/popover";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { Tokens } from "../tokens.stylex.ts";
import type {
  PopoverCloseProps,
  PopoverPopupProps,
  PopoverPortalProps,
  PopoverPositionerProps,
  PopoverRootProps,
  PopoverTitleProps,
  PopoverTriggerProps,
} from "./types.ts";

/**
 * Popup anchored to a button. Compose `Trigger`, `Portal`, `Positioner`,
 * `Popup`, `Title`, and `Close`. The popup stays open while a control
 * inside it is used.
 *
 * @example
 * ```tsx
 * import { Popover } from '@ui'
 *
 * <Popover.Root>
 *   <Popover.Trigger>View</Popover.Trigger>
 *   <Popover.Portal>
 *     <Popover.Positioner sideOffset={6} align="start">
 *       <Popover.Popup>
 *         <Popover.Close>Open</Popover.Close>
 *       </Popover.Popup>
 *     </Popover.Positioner>
 *   </Popover.Portal>
 * </Popover.Root>
 * ```
 */
export function PopoverRoot<Payload = unknown>(
  props: PopoverRootProps<Payload>,
) {
  return <BasePopover.Root {...props} />;
}

/** Button that opens the popup. */
export function PopoverTrigger<Payload = unknown>({
  sx,
  className,
  style,
  ...props
}: PopoverTriggerProps<Payload>) {
  const chrome = popoverChrome(
    stylex.props(styles.trigger, sx),
    className,
    style,
  );

  return <BasePopover.Trigger {...props} {...chrome} />;
}

/** Moves the popup to the end of `document.body`. */
export function PopoverPortal({
  sx,
  className,
  style,
  ...props
}: PopoverPortalProps) {
  const chrome = popoverChrome(stylex.props(sx), className, style);

  return <BasePopover.Portal {...props} {...chrome} />;
}

/** Places the popup against the trigger and keeps it inside the viewport. */
export function PopoverPositioner({
  sx,
  className,
  style,
  ...props
}: PopoverPositionerProps) {
  const chrome = popoverChrome(
    stylex.props(styles.positioner, sx),
    className,
    style,
  );

  return <BasePopover.Positioner {...props} {...chrome} />;
}

/** Popup surface. Place the menu rows and controls inside it. */
export function PopoverPopup({
  sx,
  className,
  style,
  ...props
}: PopoverPopupProps) {
  const chrome = popoverChrome(
    stylex.props(styles.popup, sx),
    className,
    style,
  );

  return <BasePopover.Popup {...props} {...chrome} />;
}

/** Heading for the popup. */
export function PopoverTitle({
  sx,
  className,
  style,
  ...props
}: PopoverTitleProps) {
  const chrome = popoverChrome(
    stylex.props(styles.title, sx),
    className,
    style,
  );

  return <BasePopover.Title {...props} {...chrome} />;
}

/**
 * Menu row that closes the popup. Children are the label.
 * A disabled row does not close the popup.
 */
export function PopoverClose({
  sx,
  className,
  style,
  ...props
}: PopoverCloseProps) {
  const chrome = popoverChrome(
    stylex.props(styles.close, sx),
    className,
    style,
  );

  return <BasePopover.Close {...props} {...chrome} />;
}

function popoverChrome(
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
  trigger: {
    appearance: "none",
    boxSizing: "border-box",
    margin: Tokens.spacing.none,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    textAlign: "start",
    cursor: {
      default: "pointer",
      ":disabled": "default",
      "[data-disabled]": "default",
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
  },
  positioner: {
    zIndex: 30,
  },
  popup: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minWidth: 220,
    maxWidth: "var(--available-width)",
    margin: Tokens.spacing.none,
    padding: Tokens.spacing.xs,
    backgroundColor: Tokens.color.neutral[750],
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 6,
    boxShadow: `0 8px 24px ${Tokens.color.black[45]}`,
    outlineWidth: 0,
  },
  title: {
    margin: Tokens.spacing.none,
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.lg,
    fontSize: 11,
    fontWeight: 650,
    color: Tokens.color.neutral[400],
  },
  close: {
    appearance: "none",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Tokens.spacing.xxxxl,
    width: "100%",
    margin: Tokens.spacing.none,
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.lg,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.blue[500],
      ":focus-visible": Tokens.color.blue[500],
      ":disabled": "transparent",
      "[data-disabled]": "transparent",
    },
    color: {
      default: "inherit",
      ":hover": Tokens.color.neutral[0],
      ":focus-visible": Tokens.color.neutral[0],
      ":disabled": Tokens.color.neutral[500],
      "[data-disabled]": Tokens.color.neutral[500],
    },
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.3,
    textAlign: "start",
    cursor: {
      default: "pointer",
      ":disabled": "default",
      "[data-disabled]": "default",
    },
    userSelect: "none",
    outlineWidth: 0,
  },
});
