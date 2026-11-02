import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef } from "react";
import type { KbdChord } from "./chord.ts";

type KbdChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
};

/** One key cap. Children are the key label. */
export type KbdRootProps = Omit<
  ComponentPropsWithoutRef<"kbd">,
  "className" | "style"
> &
  KbdChrome;

/** Row of key caps that read as one chord. */
export type KbdGroupProps = Omit<
  ComponentPropsWithoutRef<"kbd">,
  "className" | "style"
> &
  KbdChrome;

/** Key caps for a chord string, in the reader's platform notation. */
export type KbdShortcutProps = Omit<KbdGroupProps, "children"> & {
  /** `"Mod+Shift+Z"`, or `{ apple, other }` for a different chord per platform. */
  keys: KbdChord;
  /** Replaces the label of a named key, such as a translated `Space`. */
  names?: Partial<Record<string, string>>;
};
