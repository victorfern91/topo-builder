import { Menubar as BaseMenubar } from "@base-ui/react/menubar";
import * as stylex from "@stylexjs/stylex";
import { Tokens } from "../tokens.stylex.ts";
import type { MenubarRootProps } from "./types.ts";

/**
 * Row of menus. Place one `Menu.Root` per menu inside it. Arrow keys move
 * between the triggers, and once a menu is open, hovering another trigger
 * opens that menu.
 *
 * @example
 * ```tsx
 * import { Menu, Menubar } from '@ui'
 *
 * <Menubar.Root>
 *   <Menu.Root>
 *     <Menu.Trigger>File</Menu.Trigger>
 *     <Menu.Portal>…</Menu.Portal>
 *   </Menu.Root>
 * </Menubar.Root>
 * ```
 */
export function MenubarRoot({
  sx,
  className,
  style,
  ...props
}: MenubarRootProps) {
  const styled = stylex.props(styles.root, sx);
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return (
    <BaseMenubar
      {...props}
      className={mergedClass || undefined}
      style={{ ...styled.style, ...style }}
    />
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    gap: Tokens.spacing.xxs,
  },
});
