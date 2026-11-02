import { Menu as BaseMenu } from "@base-ui/react/menu";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { TbCheck, TbChevronRight } from "react-icons/tb";
import { Tokens } from "../tokens.stylex.ts";
import type {
  MenuGroupLabelProps,
  MenuGroupProps,
  MenuItemProps,
  MenuPopupProps,
  MenuPortalProps,
  MenuPositionerProps,
  MenuRadioGroupProps,
  MenuRadioItemIndicatorProps,
  MenuRadioItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuSubmenuRootProps,
  MenuSubmenuTriggerProps,
  MenuTriggerProps,
} from "./types.ts";

/**
 * Menu anchored to a button. Compose `Trigger`, `Portal`, `Positioner`,
 * `Popup`, and `Item`. A `SubmenuRoot` inside the popup nests a menu:
 * its `SubmenuTrigger` is a row that opens the next `Portal`.
 * Choosing an item closes every open level.
 *
 * @example
 * ```tsx
 * import { Menu } from '@ui'
 *
 * <Menu.Root>
 *   <Menu.Trigger>File</Menu.Trigger>
 *   <Menu.Portal>
 *     <Menu.Positioner sideOffset={6} align="start">
 *       <Menu.Popup>
 *         <Menu.Item>Open…</Menu.Item>
 *         <Menu.SubmenuRoot>
 *           <Menu.SubmenuTrigger>Export</Menu.SubmenuTrigger>
 *           <Menu.Portal>
 *             <Menu.Positioner>
 *               <Menu.Popup>
 *                 <Menu.Item>PNG</Menu.Item>
 *               </Menu.Popup>
 *             </Menu.Positioner>
 *           </Menu.Portal>
 *         </Menu.SubmenuRoot>
 *       </Menu.Popup>
 *     </Menu.Positioner>
 *   </Menu.Portal>
 * </Menu.Root>
 * ```
 */
export function MenuRoot<Payload = unknown>(props: MenuRootProps<Payload>) {
  return <BaseMenu.Root {...props} />;
}

/** Button that opens the menu. */
export function MenuTrigger<Payload = unknown>({
  sx,
  className,
  style,
  ...props
}: MenuTriggerProps<Payload>) {
  const chrome = menuChrome(stylex.props(styles.trigger, sx), className, style);

  return <BaseMenu.Trigger {...props} {...chrome} />;
}

/** Moves the menu to the end of `document.body`. */
export function MenuPortal({
  sx,
  className,
  style,
  ...props
}: MenuPortalProps) {
  const chrome = menuChrome(stylex.props(sx), className, style);

  return <BaseMenu.Portal {...props} {...chrome} />;
}

/**
 * Places the menu against its trigger and keeps it inside the viewport.
 * A submenu opens to the side of its row.
 */
export function MenuPositioner({
  sx,
  className,
  style,
  ...props
}: MenuPositionerProps) {
  const chrome = menuChrome(
    stylex.props(styles.positioner, sx),
    className,
    style,
  );

  return <BaseMenu.Positioner {...props} {...chrome} />;
}

/** Menu surface. Place the rows inside it. */
export function MenuPopup({ sx, className, style, ...props }: MenuPopupProps) {
  const chrome = menuChrome(stylex.props(styles.popup, sx), className, style);

  return <BaseMenu.Popup {...props} {...chrome} />;
}

/** Row that runs `onClick` and closes the menu. Children are the label. */
export function MenuItem({ sx, className, style, ...props }: MenuItemProps) {
  const chrome = menuChrome(stylex.props(styles.row, sx), className, style);

  return <BaseMenu.Item {...props} {...chrome} />;
}

/** Nested menu. Holds a `SubmenuTrigger` and the `Portal` it opens. */
export function MenuSubmenuRoot(props: MenuSubmenuRootProps) {
  return <BaseMenu.SubmenuRoot {...props} />;
}

/** Row that opens the submenu on hover, click, or the arrow key. Shows a chevron after the label. */
export function MenuSubmenuTrigger({
  sx,
  className,
  style,
  children,
  ...props
}: MenuSubmenuTriggerProps) {
  const chrome = menuChrome(
    stylex.props(styles.row, styles.submenuRow, sx),
    className,
    style,
  );

  return (
    <BaseMenu.SubmenuTrigger {...props} {...chrome}>
      {children}
      <TbChevronRight {...stylex.props(styles.glyph)} aria-hidden />
    </BaseMenu.SubmenuTrigger>
  );
}

/** Rows that belong together. Place a `GroupLabel` first to name them. */
export function MenuGroup({ sx, className, style, ...props }: MenuGroupProps) {
  const chrome = menuChrome(stylex.props(styles.group, sx), className, style);

  return <BaseMenu.Group {...props} {...chrome} />;
}

/** Muted heading for a `Group` or a `RadioGroup`. */
export function MenuGroupLabel({
  sx,
  className,
  style,
  ...props
}: MenuGroupLabelProps) {
  const chrome = menuChrome(
    stylex.props(styles.groupLabel, sx),
    className,
    style,
  );

  return <BaseMenu.GroupLabel {...props} {...chrome} />;
}

/** Rows where one `RadioItem` is chosen. `onValueChange` receives the next value. */
export function MenuRadioGroup({
  sx,
  className,
  style,
  ...props
}: MenuRadioGroupProps) {
  const chrome = menuChrome(stylex.props(styles.group, sx), className, style);

  return <BaseMenu.RadioGroup {...props} {...chrome} />;
}

/**
 * Choice inside a `RadioGroup`. Keeps the menu open unless `closeOnClick`.
 * Place a `RadioItemIndicator` before the label.
 */
export function MenuRadioItem({
  sx,
  className,
  style,
  ...props
}: MenuRadioItemProps) {
  const chrome = menuChrome(
    stylex.props(styles.row, styles.radioRow, sx),
    className,
    style,
  );

  return <BaseMenu.RadioItem {...props} {...chrome} />;
}

/** Keeps its slot on every row and shows a check on the chosen one. `children` replaces the check. */
export function MenuRadioItemIndicator({
  sx,
  className,
  style,
  children,
  ...props
}: MenuRadioItemIndicatorProps) {
  const slot = menuChrome(stylex.props(styles.indicator, sx), className, style);
  const mark = stylex.props(styles.indicatorMark);

  return (
    <span className={slot.className} style={slot.style}>
      <BaseMenu.RadioItemIndicator
        {...props}
        className={mark.className}
        style={mark.style}
      >
        {children ?? <TbCheck {...stylex.props(styles.glyph)} aria-hidden />}
      </BaseMenu.RadioItemIndicator>
    </span>
  );
}

/** Line between groups of rows. */
export function MenuSeparator({
  sx,
  className,
  style,
  ...props
}: MenuSeparatorProps) {
  const chrome = menuChrome(
    stylex.props(styles.separator, sx),
    className,
    style,
  );

  return <BaseMenu.Separator {...props} {...chrome} />;
}

function menuChrome(
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
  row: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Tokens.spacing.xxxxl,
    width: "100%",
    margin: Tokens.spacing.none,
    paddingBlock: Tokens.spacing.sm,
    paddingInline: Tokens.spacing.lg,
    borderRadius: 4,
    backgroundColor: {
      default: "transparent",
      "[data-highlighted]": Tokens.color.blue[500],
      "[data-popup-open]": Tokens.color.blue[500],
      "[data-disabled]": "transparent",
    },
    color: {
      default: "inherit",
      "[data-highlighted]": Tokens.color.neutral[0],
      "[data-popup-open]": Tokens.color.neutral[0],
      "[data-disabled]": Tokens.color.neutral[500],
    },
    fontSize: 13,
    lineHeight: 1.3,
    cursor: {
      default: "pointer",
      "[data-disabled]": "default",
    },
    userSelect: "none",
    outlineWidth: 0,
  },
  submenuRow: {
    paddingInlineEnd: Tokens.spacing.sm,
  },
  radioRow: {
    justifyContent: "flex-start",
    gap: Tokens.spacing.sm,
    paddingInlineStart: Tokens.spacing.sm,
  },
  group: {
    display: "flex",
    flexDirection: "column",
  },
  groupLabel: {
    paddingBlock: Tokens.spacing.xs,
    paddingInline: Tokens.spacing.lg,
    fontSize: 12,
    color: Tokens.color.neutral[400],
    userSelect: "none",
  },
  indicator: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: Tokens.size.xs,
    height: Tokens.size.xs,
    flexShrink: 0,
  },
  indicatorMark: {
    display: "inline-flex",
  },
  glyph: {
    flexShrink: 0,
    width: 14,
    height: 14,
  },
  separator: {
    height: 1,
    marginBlock: Tokens.spacing.xs,
    marginInline: Tokens.spacing.none,
    backgroundColor: Tokens.color.neutral[950],
    borderWidth: 0,
  },
});
