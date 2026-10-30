import * as stylex from '@stylexjs/stylex'
import { color, media } from './tokens.stylex.ts'

const shimmer = stylex.keyframes({
  '0%': { backgroundPosition: '100% 0' },
  '100%': { backgroundPosition: '-100% 0' },
})

export const board = stylex.create({
  workspace: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minHeight: 0,
    display: 'grid',
    alignItems: 'center',
    justifyItems: 'center',
    paddingBlock: {
      default: 28,
      [media.narrow]: 12,
    },
    paddingInline: {
      default: 20,
      [media.narrow]: 12,
    },
    overflow: 'auto',
    backgroundColor: color.workspace,
    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
    backgroundSize: '22px 22px',
  },
  artboard: {
    maxWidth: '100%',
    backgroundColor: color.board,
    color: color.ink,
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.45), 0 16px 40px rgba(0, 0, 0, 0.35)',
  },
  card: {
    width: 'min(560px, 100%)',
    minHeight: {
      default: 280,
      [media.narrow]: 220,
    },
    paddingBlock: {
      default: 36,
      [media.narrow]: 24,
    },
    paddingInline: {
      default: 32,
      [media.narrow]: 16,
    },
  },
  message: {
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'start',
    gap: 12,
  },
  loading: {
    display: 'grid',
    alignContent: 'center',
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 650,
    letterSpacing: '-0.02em',
  },
  alertTitle: {
    color: color.danger,
  },
  copy: {
    marginTop: 0,
    marginRight: 0,
    marginBottom: 8,
    marginLeft: 0,
    maxWidth: '42ch',
  },
  kicker: {
    margin: 0,
    fontSize: 13,
    color: color.muted,
  },
  progressBlock: {
    display: 'grid',
    gap: 10,
    width: '100%',
  },
  progressMeta: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressName: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  percent: {
    flexGrow: 0,
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#e4e4e4',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: color.primary,
  },
  button: {
    appearance: 'none',
    borderWidth: 0,
    backgroundColor: {
      default: color.primary,
      ':hover': color.primaryHover,
    },
    color: '#ffffff',
    height: 32,
    paddingBlock: 0,
    paddingInline: 14,
    borderRadius: 16,
    fontSize: 13,
    fontWeight: 650,
    cursor: 'pointer',
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineColor: {
      default: 'transparent',
      ':focus-visible': '#0b4fa8',
    },
    outlineOffset: 2,
  },
  skeleton: {
    borderRadius: 2,
    backgroundImage: 'linear-gradient(90deg, #e6e6e6 0%, #f5f5f5 50%, #e6e6e6 100%)',
    backgroundSize: '200% 100%',
    animationName: {
      default: shimmer,
      [media.reduceMotion]: 'none',
    },
    animationDuration: '1.2s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  },
  skeletonLine: {
    width: '42%',
    height: 12,
  },
  skeletonImage: {
    width: '100%',
    height: 180,
  },
  imageFrame: {
    display: 'inline-block',
    lineHeight: 0,
    backgroundColor: 'transparent',
  },
  image: {
    display: 'block',
    width: 'auto',
    height: 'auto',
    backgroundColor: color.board,
    backgroundImage:
      'linear-gradient(45deg, #e4e4e4 25%, transparent 25%), linear-gradient(-45deg, #e4e4e4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e4 75%), linear-gradient(-45deg, transparent 75%, #e4e4e4 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
  },
})
