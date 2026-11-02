import { Kbd, type KbdChord } from "@ui";
import { t } from "./i18n/index.ts";

/**
 * Every keyboard shortcut the app shows. Chords use the `Kbd` notation:
 * `Mod` is Command on Apple and Ctrl elsewhere. Use `{ apple, other }` when
 * the platforms differ.
 */
export const shortcuts = {
  open: "Mod+O",
  undo: "Mod+Z",
  redo: { apple: "Mod+Shift+Z", other: "Mod+Y" },
  "zoom-in": "Mod+Plus",
  "zoom-out": "Mod+Minus",
  fit: "Mod+0",
  "actual-size": "Mod+1",
  pan: "Space",
} as const satisfies Record<string, KbdChord>;

export type ShortcutId = keyof typeof shortcuts;

export const shortcutIds = Object.keys(shortcuts) as [
  ShortcutId,
  ...ShortcutId[],
];

/** Key labels the app translates. */
export function shortcutNames(): Partial<Record<string, string>> {
  return { Space: t("spaceKey") };
}

/** Chord text for a title or a sentence, in the reader's platform notation. */
export function shortcutText(id: ShortcutId): string {
  return Kbd.format(shortcuts[id], shortcutNames());
}

/** Space-separated `aria-keyshortcuts` value for several entries. */
export function shortcutAria(ids: readonly ShortcutId[]): string {
  return ids.map((id) => Kbd.aria(shortcuts[id])).join(" ");
}

/** `"Undo (⌘Z)"` for a button title. */
export function titleWithShortcut(label: string, id?: ShortcutId): string {
  return id ? `${label} (${shortcutText(id)})` : label;
}
