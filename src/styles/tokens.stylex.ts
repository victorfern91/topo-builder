import * as stylex from '@stylexjs/stylex'

export const color = stylex.defineConsts({
  workspace: '#1e1e1e',
  bar: '#323232',
  barLine: '#1a1a1a',
  text: '#f2f2f2',
  doc: '#e8e8e8',
  primary: '#1473e6',
  primaryHover: '#0d66d0',
  focus: '#7fb6ff',
  board: '#ffffff',
  ink: '#2c2c2c',
  muted: '#5c5c5c',
  danger: '#b40000',
  menu: '#2a2a2a',
  kbd: '#bdbdbd',
  menuLine: '#111111',
})

export const media = stylex.defineConsts({
  narrow: '@media (max-width: 720px)',
  reduceMotion: '@media (prefers-reduced-motion: reduce)',
})
