import { Select as BaseSelect } from "@base-ui/react/select";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { TbCheck, TbChevronDown } from "react-icons/tb";
import { Tokens } from "../tokens.stylex.ts";
import type {
  SelectIconProps,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectListProps,
  SelectPopupProps,
  SelectPortalProps,
  SelectPositionerProps,
  SelectRootProps,
  SelectSwatchProps,
  SelectTriggerProps,
  SelectValueProps,
} from "./types.ts";

/**
 * Single-value list. Compose `Trigger`, `Value`, `Icon`, `Portal`,
 * `Positioner`, `Popup`, `List`, `Item`, `ItemIndicator`, `Swatch`,
 * and `ItemText`. `value` `null` is the empty selection.
 *
 * @example
 * ```tsx
 * import { Select } from '@ui'
 *
 * <Select.Root value={grade} onValueChange={setGrade}>
 *   <Select.Trigger aria-label="Route grade">
 *     <Select.Value placeholder="Grade" />
 *     <Select.Icon />
 *   </Select.Trigger>
 *   <Select.Portal>
 *     <Select.Positioner>
 *       <Select.Popup>
 *         <Select.List>
 *           <Select.Item value={5} label="5c">
 *             <Select.ItemIndicator />
 *             <Select.Swatch color="#6e9439" edge="#2a472f" />
 *             <Select.ItemText>5c</Select.ItemText>
 *           </Select.Item>
 *         </Select.List>
 *       </Select.Popup>
 *     </Select.Positioner>
 *   </Select.Portal>
 * </Select.Root>
 * ```
 */
export function SelectRoot<Value, Multiple extends boolean | undefined = false>(
  props: SelectRootProps<Value, Multiple>,
) {
  return <BaseSelect.Root {...props} />;
}

/** Button that opens the list. */
export function SelectTrigger({
  sx,
  className,
  style,
  ...props
}: SelectTriggerProps) {
  const chrome = selectChrome(
    stylex.props(styles.trigger, sx),
    className,
    style,
  );

  return <BaseSelect.Trigger {...props} {...chrome} />;
}

/**
 * Label of the selected item.
 * A function child receives the current value. `placeholder` shows when the
 * value is empty and no function child returns a node.
 */
export function SelectValue({
  sx,
  className,
  style,
  ...props
}: SelectValueProps) {
  const chrome = selectChrome(stylex.props(styles.value, sx), className, style);

  return <BaseSelect.Value {...props} {...chrome} />;
}

/** Chevron on the trigger. `children` replaces it. */
export function SelectIcon({
  sx,
  className,
  style,
  children,
  ...props
}: SelectIconProps) {
  const chrome = selectChrome(stylex.props(styles.icon, sx), className, style);

  return (
    <BaseSelect.Icon {...props} {...chrome}>
      {children ?? (
        <TbChevronDown {...stylex.props(styles.glyph)} aria-hidden />
      )}
    </BaseSelect.Icon>
  );
}

/** Moves the list to the end of `document.body`. */
export function SelectPortal({
  sx,
  className,
  style,
  ...props
}: SelectPortalProps) {
  const chrome = selectChrome(stylex.props(sx), className, style);

  return <BaseSelect.Portal {...props} {...chrome} />;
}

/**
 * Places the popup against the trigger and keeps it inside the viewport.
 * The popup stays on the trigger. `alignItemWithTrigger` moves it so the
 * selected option covers the trigger.
 */
export function SelectPositioner({
  alignItemWithTrigger = false,
  sx,
  className,
  style,
  ...props
}: SelectPositionerProps) {
  const chrome = selectChrome(
    stylex.props(styles.positioner, sx),
    className,
    style,
  );

  return (
    <BaseSelect.Positioner
      alignItemWithTrigger={alignItemWithTrigger}
      {...props}
      {...chrome}
    />
  );
}

/** List surface. It scrolls when the options exceed the viewport. */
export function SelectPopup({
  sx,
  className,
  style,
  ...props
}: SelectPopupProps) {
  const chrome = selectChrome(stylex.props(styles.popup, sx), className, style);

  return <BaseSelect.Popup {...props} {...chrome} />;
}

/** Option column inside the popup. */
export function SelectList({
  sx,
  className,
  style,
  ...props
}: SelectListProps) {
  const chrome = selectChrome(stylex.props(styles.list, sx), className, style);

  return <BaseSelect.List {...props} {...chrome} />;
}

/** One option. `label` is the keyboard search text. */
export function SelectItem({
  sx,
  className,
  style,
  ...props
}: SelectItemProps) {
  const chrome = selectChrome(stylex.props(styles.item, sx), className, style);

  return <BaseSelect.Item {...props} {...chrome} />;
}

/**
 * Check for the selected option. The slot stays in place so a following
 * color icon lines up on every row. `children` replaces the check.
 */
export function SelectItemIndicator({
  sx,
  className,
  style,
  children,
  ...props
}: SelectItemIndicatorProps) {
  const slot = selectChrome(
    stylex.props(styles.indicator, sx),
    className,
    style,
  );
  const mark = stylex.props(styles.indicatorMark);

  return (
    <span className={slot.className} style={slot.style}>
      <BaseSelect.ItemIndicator
        {...props}
        className={mark.className}
        style={mark.style}
      >
        {children ?? <TbCheck {...stylex.props(styles.glyph)} aria-hidden />}
      </BaseSelect.ItemIndicator>
    </span>
  );
}

/**
 * Color icon. Use the same swatch in the selected value and in each option.
 * `color` is the fill. `edge` is the inset line.
 */
export function SelectSwatch({
  color,
  edge,
  sx,
  className,
  style,
  ...props
}: SelectSwatchProps) {
  const chrome = selectChrome(stylex.props(styles.swatch, sx), className, {
    backgroundColor: color,
    boxShadow: `inset 0 0 0 1px ${edge ?? Tokens.color.black[45]}`,
    ...style,
  });

  return <span {...props} {...chrome} />;
}

/** Option label. Stays on one line inside the item. */
export function SelectItemText({
  sx,
  className,
  style,
  ...props
}: SelectItemTextProps) {
  const chrome = selectChrome(
    stylex.props(styles.itemText, sx),
    className,
    style,
  );

  return <BaseSelect.ItemText {...props} {...chrome} />;
}

function selectChrome(
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Tokens.spacing.sm,
    width: "100%",
    minWidth: 0,
    height: Tokens.size.md,
    margin: Tokens.spacing.none,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 4,
    backgroundColor: Tokens.color.neutral[850],
    color: Tokens.color.neutral[100],
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.2,
    textAlign: "start",
    cursor: {
      default: "pointer",
      ":disabled": "default",
      "[data-disabled]": "default",
    },
    opacity: {
      default: 1,
      ":disabled": 0.45,
      "[data-disabled]": 0.45,
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
  value: {
    display: "flex",
    alignItems: "center",
    gap: Tokens.spacing.sm,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    color: {
      default: "inherit",
      "[data-placeholder]": Tokens.color.neutral[400],
    },
  },
  icon: {
    display: "inline-flex",
    flexGrow: 0,
    flexShrink: 0,
    color: Tokens.color.neutral[400],
    transform: {
      default: "rotate(0deg)",
      "[data-popup-open]": "rotate(180deg)",
    },
    transitionProperty: "transform",
    transitionDuration: {
      default: "120ms",
      [Tokens.media.reduceMotion]: "0s",
    },
  },
  glyph: {
    width: 16,
    height: 16,
    display: "block",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  positioner: {
    zIndex: 45,
  },
  popup: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minWidth: "var(--anchor-width)",
    maxWidth: "var(--available-width)",
    maxHeight: "min(280px, var(--available-height))",
    margin: Tokens.spacing.none,
    padding: Tokens.spacing.xs,
    overflow: "auto",
    backgroundColor: Tokens.color.neutral[750],
    color: Tokens.color.neutral[100],
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 6,
    boxShadow: `0 8px 24px ${Tokens.color.black[45]}`,
    outlineWidth: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: Tokens.spacing.xxs,
    minWidth: 0,
  },
  indicator: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: Tokens.size.xs,
    height: Tokens.size.xs,
    minWidth: Tokens.size.xs,
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden",
    color: Tokens.color.neutral[100],
  },
  indicatorMark: {
    display: "inline-flex",
  },
  swatch: {
    width: 12,
    height: 12,
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 2,
  },
  itemText: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: Tokens.spacing.sm,
    minHeight: Tokens.size.md,
    paddingBlock: Tokens.spacing.xs,
    paddingInline: Tokens.spacing.md,
    borderRadius: 4,
    fontSize: 13,
    lineHeight: 1.2,
    fontVariantNumeric: "tabular-nums",
    cursor: {
      default: "pointer",
      "[data-disabled]": "default",
    },
    userSelect: "none",
    outlineWidth: 0,
    backgroundColor: {
      default: "transparent",
      "[data-highlighted]": Tokens.color.blue[28],
      "[data-selected]": Tokens.color.white[6],
    },
  },
});
