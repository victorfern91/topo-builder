import { ariaChord, formatChord, kbdPlatform } from "./chord.ts";
import { KbdGroup, KbdRoot, KbdShortcut } from "./kbd.tsx";

/**
 * Keyboard keys. Compose `Root` caps inside a `Group`, or pass a chord to
 * `Shortcut`. `format` returns the same chord as text for a title,
 * `aria` returns the `aria-keyshortcuts` value, and `platform` is `apple`
 * or `other`.
 */
export const Kbd = {
  Root: KbdRoot,
  Group: KbdGroup,
  Shortcut: KbdShortcut,
  format: formatChord,
  aria: ariaChord,
  platform: kbdPlatform,
};

export default Kbd;

export type {
  KbdChord,
  KbdChordText,
  KbdKey,
  KbdModifier,
  KbdPlatform,
} from "./chord.ts";
export type { KbdGroupProps, KbdRootProps, KbdShortcutProps } from "./types.ts";
