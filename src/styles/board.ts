import * as stylex from "@stylexjs/stylex";
import { Tokens } from "@ui";

const shimmer = stylex.keyframes({
  "0%": { backgroundPosition: "100% 0" },
  "100%": { backgroundPosition: "-100% 0" },
});

export const board = stylex.create({
  workspace: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    minHeight: 0,
    display: "grid",
    alignItems: "center",
    justifyItems: "center",
    paddingBlock: {
      default: 28,
      [Tokens.media.narrow]: Tokens.spacing.xl,
    },
    paddingInline: {
      default: 20,
      [Tokens.media.narrow]: Tokens.spacing.xl,
    },
    overflow: "auto",
    backgroundColor: Tokens.color.neutral[800],
    backgroundImage: `radial-gradient(${Tokens.color.white[5]} 1px, transparent 1px)`,
    backgroundSize: "22px 22px",
  },
  artboard: {
    maxWidth: "100%",
    backgroundColor: Tokens.color.neutral[0],
    color: Tokens.color.neutral[700],
    boxShadow: `0 0 0 1px ${Tokens.color.black[45]}, 0 16px 40px ${Tokens.color.black[35]}`,
  },
  card: {
    width: "min(560px, 100%)",
    minHeight: {
      default: 280,
      [Tokens.media.narrow]: 220,
    },
    paddingBlock: {
      default: 36,
      [Tokens.media.narrow]: Tokens.spacing.xxxxl,
    },
    paddingInline: {
      default: 32,
      [Tokens.media.narrow]: Tokens.spacing.xxxl,
    },
  },
  message: {
    display: "grid",
    alignContent: "center",
    justifyItems: "start",
    gap: Tokens.spacing.xl,
  },
  loading: {
    display: "grid",
    alignContent: "center",
    gap: Tokens.spacing.xxxl,
  },
  title: {
    margin: Tokens.spacing.none,
    fontSize: 22,
    fontWeight: 650,
    letterSpacing: "-0.02em",
  },
  alertTitle: {
    color: Tokens.color.red[500],
  },
  copy: {
    marginTop: Tokens.spacing.none,
    marginRight: Tokens.spacing.none,
    marginBottom: Tokens.spacing.md,
    marginLeft: Tokens.spacing.none,
    maxWidth: "42ch",
  },
  kicker: {
    margin: Tokens.spacing.none,
    fontSize: 13,
    color: Tokens.color.neutral[500],
  },
  progressBlock: {
    display: "grid",
    gap: Tokens.spacing.lg,
    width: "100%",
  },
  progressMeta: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Tokens.spacing.xl,
  },
  progressName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  percent: {
    flexGrow: 0,
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  progressTrack: {
    width: "100%",
    height: Tokens.size.xxs,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: Tokens.color.neutral[300],
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Tokens.color.blue[500],
  },
  button: {
    outlineColor: {
      default: "transparent",
      ":focus-visible": Tokens.color.blue[700],
    },
    outlineOffset: 2,
  },
  skeleton: {
    borderRadius: 2,
    backgroundImage: `linear-gradient(90deg, ${Tokens.color.neutral[250]} 0%, ${Tokens.color.neutral[50]} 50%, ${Tokens.color.neutral[250]} 100%)`,
    backgroundSize: "200% 100%",
    animationName: {
      default: shimmer,
      [Tokens.media.reduceMotion]: "none",
    },
    animationDuration: "1.2s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  skeletonLine: {
    width: "42%",
    height: 12,
  },
  skeletonImage: {
    width: "100%",
    height: 180,
  },
  imageFrame: {
    display: "inline-block",
    lineHeight: 0,
    backgroundColor: "transparent",
  },
  image: {
    display: "block",
    width: "auto",
    height: "auto",
    backgroundColor: Tokens.color.neutral[0],
    backgroundImage: `linear-gradient(45deg, ${Tokens.color.neutral[300]} 25%, transparent 25%), linear-gradient(-45deg, ${Tokens.color.neutral[300]} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${Tokens.color.neutral[300]} 75%), linear-gradient(-45deg, transparent 75%, ${Tokens.color.neutral[300]} 75%)`,
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
  },
});
