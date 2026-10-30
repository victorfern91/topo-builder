import * as stylex from '@stylexjs/stylex'
import { Button } from '@base-ui/react/button'
import { useSelector } from '@tanstack/react-store'
import { imageFormats, t } from '../i18n/index.ts'
import { board } from '../styles/board.ts'
import {
  imageDocumentStore,
  requestImageFilePicker,
  type ImageProblem,
} from '../state/image-document.ts'

export default function ArtboardPage() {
  const opened = useSelector(imageDocumentStore, (state) => state)

  if (opened.status === 'loading') {
    return (
      <section {...stylex.props(board.workspace)} aria-busy="true" aria-live="polite">
        <div {...stylex.props(board.artboard, board.card, board.loading)}>
          <p {...stylex.props(board.kicker)}>{t('opening', { fileName: opened.fileName })}</p>
          <div {...stylex.props(board.skeleton, board.skeletonImage)} />
        </div>
      </section>
    )
  }

  if (opened.status === 'error') {
    return (
      <section {...stylex.props(board.workspace)}>
        <div {...stylex.props(board.artboard, board.card, board.message)} role="alert">
          <h1 {...stylex.props(board.title, board.alertTitle)}>{t('cannotShowFile')}</h1>
          <p {...stylex.props(board.copy)}>{problemText(opened.problem, opened.fileName)}</p>
          <Button {...stylex.props(board.button)} onClick={requestImageFilePicker}>
            {t('chooseAnotherFile')}
          </Button>
        </div>
      </section>
    )
  }

  if (opened.status === 'ready') {
    return (
      <section {...stylex.props(board.workspace)}>
        <div {...stylex.props(board.artboard, board.imageFrame)}>
          <img
            key={opened.objectUrl}
            {...stylex.props(board.image)}
            src={opened.objectUrl}
            alt={opened.fileName || t('openedImage')}
          />
        </div>
      </section>
    )
  }

  return (
    <section {...stylex.props(board.workspace)}>
      <div {...stylex.props(board.artboard, board.card, board.message)}>
        <h1 {...stylex.props(board.title)}>{t('noImageTitle')}</h1>
        <p {...stylex.props(board.copy)}>{t('emptyArtboard', { formats: imageFormats() })}</p>
        <Button {...stylex.props(board.button)} onClick={requestImageFilePicker}>
          {t('openImage')}
        </Button>
      </div>
    </section>
  )
}

function problemText(problem: ImageProblem, fileName: string): string {
  if (problem === 'not-a-picture') {
    return t('notAPicture', { fileName, formats: imageFormats() })
  }
  return t('cannotDecode', { fileName })
}
