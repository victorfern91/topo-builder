import * as stylex from '@stylexjs/stylex'
import { t } from '../i18n/index.ts'
import { a11y } from '../styles/a11y.ts'
import { board } from '../styles/board.ts'

export function WorkspaceSkeleton() {
  return (
    <div {...stylex.props(board.workspace)} aria-busy="true" aria-live="polite">
      <div {...stylex.props(board.artboard, board.card, board.loading)}>
        <div {...stylex.props(board.skeleton, board.skeletonLine)} />
        <div {...stylex.props(board.skeleton, board.skeletonImage)} />
      </div>
      <span {...stylex.props(a11y.visuallyHidden)}>{t('loadingArtboard')}</span>
    </div>
  )
}
