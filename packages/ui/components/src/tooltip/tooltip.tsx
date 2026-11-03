import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { Tokens } from "../tokens.stylex.ts";
import type {
  TooltipHintProps,
  TooltipPopupProps,
  TooltipPortalProps,
  TooltipPositionerProps,
  TooltipProviderProps,
  TooltipRootProps,
  TooltipTriggerProps,
} from "./types.ts";

/**
 * Hint that appears on hover or focus. Compose `Provider`, `Root`,
 * `Trigger`, `Portal`, `Positioner`, and `Popup`.
 * Keep `aria-label` on the trigger; the popup is visual-only.
 *
 * @example
 * ```tsx
 * import { Tooltip } from '@ui'
 *
 * <Tooltip.Provider>
 *   <Tooltip.Hint label="Close">
 *     <Button.Root type="button" aria-label="Close" onClick={close}>
 *       <Button.Icon id="close" />
 *     </Button.Root>
 *   </Tooltip.Hint>
 * </Tooltip.Provider>
 * ```
 */
export function TooltipProvider(props: TooltipProviderProps) {
  return <BaseTooltip.Provider {...props} />;
}

export function TooltipRoot<Payload = unknown>(
  props: TooltipRootProps<Payload>,
) {
  return <BaseTooltip.Root {...props} />;
}

/** Element that shows the tooltip on hover or focus. */
export function TooltipTrigger<Payload = unknown>({
  sx,
  className,
  style,
  render,
  ...props
}: TooltipTriggerProps<Payload>) {
  const chrome = tooltipChrome(
    stylex.props(render == null && styles.trigger, sx),
    className,
    style,
  );

  return <BaseTooltip.Trigger {...props} render={render} {...chrome} />;
}

/**
 * Hint attached to one control. Children are that control.
 * Keep `aria-label` on the child; `label` is visual-only.
 */
export function TooltipHint({
  label,
  children,
  sideOffset = 6,
}: TooltipHintProps) {
  return (
    <TooltipRoot>
      <TooltipTrigger render={children} />
      <TooltipPortal>
        <TooltipPositioner sideOffset={sideOffset}>
          <TooltipPopup>{label}</TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </TooltipRoot>
  );
}

/** Moves the tooltip to the end of `document.body`. */
export function TooltipPortal({
  sx,
  className,
  style,
  ...props
}: TooltipPortalProps) {
  const chrome = tooltipChrome(stylex.props(sx), className, style);

  return <BaseTooltip.Portal {...props} {...chrome} />;
}

/** Places the tooltip against the trigger and keeps it inside the viewport. */
export function TooltipPositioner({
  sx,
  className,
  style,
  ...props
}: TooltipPositionerProps) {
  const chrome = tooltipChrome(
    stylex.props(styles.positioner, sx),
    className,
    style,
  );

  return <BaseTooltip.Positioner {...props} {...chrome} />;
}

/** Tooltip surface. Children are the hint text. */
export function TooltipPopup({
  sx,
  className,
  style,
  ...props
}: TooltipPopupProps) {
  const chrome = tooltipChrome(
    stylex.props(styles.popup, sx),
    className,
    style,
  );

  return <BaseTooltip.Popup {...props} {...chrome} />;
}

function tooltipChrome(
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
    zIndex: 40,
  },
  popup: {
    boxSizing: "border-box",
    margin: Tokens.spacing.none,
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.md,
    backgroundColor: Tokens.color.black[40],
    color: Tokens.color.neutral[100],
    borderWidth: 0,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    outlineWidth: 0,
    backdropFilter: "blur(4px)",
    transformOrigin: "var(--transform-origin)",
  },
});
