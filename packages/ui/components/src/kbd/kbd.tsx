import * as stylex from "@stylexjs/stylex";
import { Tokens } from "../tokens.stylex.ts";
import { ariaChord, chordKeys } from "./chord.ts";
import type { KbdGroupProps, KbdRootProps, KbdShortcutProps } from "./types.ts";

/**
 * One key cap. Pass `sx` for this cap.
 *
 * @example
 * ```tsx
 * import { Kbd } from '@ui'
 *
 * <Kbd.Root>Esc</Kbd.Root>
 * ```
 */
export function KbdRoot({ sx, ...props }: KbdRootProps) {
  return <kbd {...props} {...stylex.props(styles.key, sx)} />;
}

/**
 * Key caps that read as one chord. Pass `sx` for the row.
 *
 * @example
 * ```tsx
 * <Kbd.Group>
 *   <Kbd.Root>Ctrl</Kbd.Root>
 *   <Kbd.Root>B</Kbd.Root>
 * </Kbd.Group>
 * ```
 */
export function KbdGroup({ sx, ...props }: KbdGroupProps) {
  return <kbd {...props} {...stylex.props(styles.group, sx)} />;
}

/**
 * Key caps for a chord. `keys` is `"Mod+Shift+Z"` or `{ apple, other }`.
 * `Mod` shows `⌘` on Apple and `Ctrl` elsewhere. Sets `aria-keyshortcuts`.
 *
 * @example
 * ```tsx
 * <Kbd.Shortcut keys="Mod+Shift+Z" />
 * <Kbd.Shortcut keys={{ apple: "Mod+Shift+Z", other: "Mod+Y" }} />
 * ```
 */
export function KbdShortcut({ keys, names, ...props }: KbdShortcutProps) {
  return (
    <KbdGroup aria-keyshortcuts={ariaChord(keys)} {...props}>
      {chordKeys(keys, names).map((label, index) => (
        <KbdRoot key={index}>{label}</KbdRoot>
      ))}
    </KbdGroup>
  );
}

const styles = stylex.create({
  key: {
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: Tokens.size.xs,
    height: Tokens.size.xs,
    paddingInline: Tokens.spacing.xs,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.white[12],
    borderRadius: 4,
    backgroundColor: Tokens.color.white[5],
    color: "inherit",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    userSelect: "none",
    pointerEvents: "none",
  },
  group: {
    display: "inline-flex",
    alignItems: "center",
    gap: Tokens.spacing.xxs,
    color: Tokens.color.neutral[400],
    fontFamily: "inherit",
  },
});
