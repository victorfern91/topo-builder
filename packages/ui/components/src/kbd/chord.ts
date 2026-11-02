/** Keyboard family the chord renders for. */
export type KbdPlatform = "apple" | "other";

/** `Mod` is Command on Apple and Ctrl elsewhere. `Meta` is Command on Apple and Win elsewhere. `Alt` is Option on Apple. */
export type KbdModifier = "Mod" | "Ctrl" | "Alt" | "Shift" | "Meta";

type Letter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Punctuation = "," | "." | "/" | ";" | "'" | "[" | "]" | "\\" | "`" | "=";
type NamedKey =
  | "Plus"
  | "Minus"
  | "Space"
  | "Enter"
  | "Escape"
  | "Tab"
  | "Backspace"
  | "Delete"
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight";
type FunctionKey =
  `F${"1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12"}`;

/** The one non-modifier key of a chord. */
export type KbdKey = Letter | Digit | Punctuation | NamedKey | FunctionKey;

/** Up to three modifiers, then the key, joined with `+`: `"Mod+Shift+Z"`. */
export type KbdChordText =
  | KbdKey
  | `${KbdModifier}+${KbdKey}`
  | `${KbdModifier}+${KbdModifier}+${KbdKey}`
  | `${KbdModifier}+${KbdModifier}+${KbdModifier}+${KbdKey}`;

/** One chord for every platform, or `{ apple, other }` when they differ. */
export type KbdChord =
  KbdChordText | { apple: KbdChordText; other: KbdChordText };

type Modifier = Exclude<KbdModifier, "Mod">;

type ParsedChord = { modifiers: Modifier[]; key: KbdKey };

const MODIFIER_ORDER: Modifier[] = ["Ctrl", "Alt", "Shift", "Meta"];

const MODIFIER_TEXT: Record<KbdPlatform, Record<Modifier, string>> = {
  apple: { Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Meta: "⌘" },
  other: { Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Win" },
};

const MODIFIER_ARIA: Record<Modifier, string> = {
  Ctrl: "Control",
  Alt: "Alt",
  Shift: "Shift",
  Meta: "Meta",
};

const NAMED_KEYS: Record<
  NamedKey,
  { apple: string; other: string; aria: string }
> = {
  Plus: { apple: "+", other: "+", aria: "Plus" },
  Minus: { apple: "−", other: "−", aria: "-" },
  Space: { apple: "Space", other: "Space", aria: "Space" },
  Enter: { apple: "↩", other: "Enter", aria: "Enter" },
  Escape: { apple: "Esc", other: "Esc", aria: "Escape" },
  Tab: { apple: "⇥", other: "Tab", aria: "Tab" },
  Backspace: { apple: "⌫", other: "Backspace", aria: "Backspace" },
  Delete: { apple: "⌦", other: "Delete", aria: "Delete" },
  ArrowUp: { apple: "↑", other: "↑", aria: "ArrowUp" },
  ArrowDown: { apple: "↓", other: "↓", aria: "ArrowDown" },
  ArrowLeft: { apple: "←", other: "←", aria: "ArrowLeft" },
  ArrowRight: { apple: "→", other: "→", aria: "ArrowRight" },
};

let detected: KbdPlatform | undefined;

/** `apple` on macOS and iOS, `other` everywhere else. */
export function kbdPlatform(): KbdPlatform {
  detected ??=
    typeof navigator !== "undefined" &&
    /\b(Mac|iPhone|iPad|iPod)\b/i.test(navigator.userAgent)
      ? "apple"
      : "other";
  return detected;
}

function parseChord(chord: KbdChord, platform: KbdPlatform): ParsedChord {
  const text = typeof chord === "string" ? chord : chord[platform];
  const tokens = text.split("+");
  const key = tokens.pop() as KbdKey;
  const modifiers = new Set(
    (tokens as KbdModifier[]).map((token) =>
      token === "Mod" ? (platform === "apple" ? "Meta" : "Ctrl") : token,
    ),
  );
  return {
    modifiers: MODIFIER_ORDER.filter((name) => modifiers.has(name)),
    key,
  };
}

/**
 * Visible labels, one per key, in platform order.
 * `names` replaces the label of a named key, such as a translated `Space`.
 */
export function chordKeys(
  chord: KbdChord,
  names?: Partial<Record<string, string>>,
  platform: KbdPlatform = kbdPlatform(),
): string[] {
  const parsed = parseChord(chord, platform);
  const text = MODIFIER_TEXT[platform];
  return [
    ...parsed.modifiers.map((modifier) => text[modifier]),
    names?.[parsed.key] ?? namedKey(parsed.key)?.[platform] ?? parsed.key,
  ];
}

/** One string for a title or a sentence: `⌘⇧Z` on Apple, `Ctrl+Shift+Z` elsewhere. */
export function formatChord(
  chord: KbdChord,
  names?: Partial<Record<string, string>>,
  platform: KbdPlatform = kbdPlatform(),
): string {
  return chordKeys(chord, names, platform).join(
    platform === "apple" ? "" : "+",
  );
}

/** Value for `aria-keyshortcuts`, such as `Meta+Shift+Z`. */
export function ariaChord(
  chord: KbdChord,
  platform: KbdPlatform = kbdPlatform(),
): string {
  const parsed = parseChord(chord, platform);
  return [
    ...parsed.modifiers.map((modifier) => MODIFIER_ARIA[modifier]),
    namedKey(parsed.key)?.aria ?? parsed.key,
  ].join("+");
}

function namedKey(key: KbdKey) {
  return key in NAMED_KEYS ? NAMED_KEYS[key as NamedKey] : undefined;
}
