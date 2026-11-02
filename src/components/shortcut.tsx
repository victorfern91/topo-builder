import type { StyleXStyles } from "@stylexjs/stylex";
import { Kbd } from "@ui";
import { shortcutNames, shortcuts, type ShortcutId } from "../shortcuts.ts";

/** Key caps for a `shortcuts.json` entry. */
export function Shortcut({ id, sx }: { id: ShortcutId; sx?: StyleXStyles }) {
  return <Kbd.Shortcut keys={shortcuts[id]} names={shortcutNames()} sx={sx} />;
}
