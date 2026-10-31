import * as stylex from "@stylexjs/stylex";

/**
 * Design tokens for the app and the UI package.
 *
 * Size and spacing share step names (`xs` through `xl`). Color hues use
 * numeric steps: a higher step is darker. `white` and `black` steps are an
 * opacity percent. `blue` steps below 100 are an opacity percent of `blue[500]`.
 *
 * @example
 * ```tsx
 * import { Tokens } from '@ui'
 *
 * height: Tokens.size.md
 * gap: Tokens.spacing.md
 * backgroundColor: Tokens.color.neutral[100]
 * color: Tokens.color.blue[500]
 * ```
 *
 * Inside `stylex.create`, use that named import. `import Tokens from '@ui/tokens'`
 * is the same object for values read from JavaScript.
 */
export const Tokens = stylex.unstable_defineConstsNested({
  size: {
    xxs: 8,
    xs: 16,
    sm: 24,
    md: 28,
    lg: 32,
    xl: 36,
  },
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    xxl: 14,
    xxxl: 16,
    xxxxl: 24,
  },
  color: {
    neutral: {
      0: "#ffffff",
      50: "#f5f5f5",
      100: "#f2f2f2",
      200: "#e8e8e8",
      250: "#e6e6e6",
      300: "#e4e4e4",
      400: "#bdbdbd",
      500: "#5c5c5c",
      600: "#323232",
      700: "#2c2c2c",
      750: "#2a2a2a",
      800: "#1e1e1e",
      850: "#1a1a1a",
      900: "#141414",
      950: "#111111",
      1000: "#0b0b0b",
    },
    blue: {
      22: "rgba(20, 115, 230, 0.22)",
      28: "rgba(20, 115, 230, 0.28)",
      35: "rgba(20, 115, 230, 0.35)",
      100: "#7fb6ff",
      500: "#1473e6",
      600: "#0d66d0",
      700: "#0b4fa8",
    },
    red: {
      500: "#b40000",
    },
    white: {
      4: "rgba(255, 255, 255, 0.04)",
      5: "rgba(255, 255, 255, 0.05)",
      6: "rgba(255, 255, 255, 0.06)",
      8: "rgba(255, 255, 255, 0.08)",
      12: "rgba(255, 255, 255, 0.12)",
      45: "rgba(255, 255, 255, 0.45)",
    },
    black: {
      35: "rgba(0, 0, 0, 0.35)",
      40: "rgba(0, 0, 0, 0.4)",
      45: "rgba(0, 0, 0, 0.45)",
      55: "rgba(0, 0, 0, 0.55)",
      70: "rgba(0, 0, 0, 0.7)",
    },
  },
  media: {
    narrow: "@media (max-width: 720px)",
    reduceMotion: "@media (prefers-reduced-motion: reduce)",
  },
});

export default Tokens;
