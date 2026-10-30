import * as stylex from '@stylexjs/stylex'
import { Button } from '@base-ui/react/button'
import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { ArtboardStage } from '../components/artboard-stage.tsx'
import { formatPercent, imageFormats, t } from '../i18n/index.ts'
import { useViewport } from '../state/use-viewport.ts'
import { board } from '../styles/board.ts'
import { stage } from '../styles/stage.ts'
import {
  imageDocumentStore,
  requestImageFilePicker,
  type ImageProblem,
} from '../state/image-document.ts'
import { clearLines } from '../state/lines.ts'

export default function ArtboardPage() {
  const opened = useSelector(imageDocumentStore, (state) => state)

  if (opened.status === 'loading' && opened.progress !== null) {
    return <TiffConversion fileName={opened.fileName} progress={opened.progress} />
  }

  if (opened.status === 'loading') {
    return (
      <ArtboardStage contentKey={`loading:${opened.fileName}`} placement="center">
        <div
          {...stylex.props(board.artboard, board.card, board.loading, stage.sheet)}
          aria-busy="true"
          aria-live="polite"
        >
          <p {...stylex.props(board.kicker)}>{t('opening', { fileName: opened.fileName })}</p>
          <div {...stylex.props(board.skeleton, board.skeletonImage)} />
        </div>
      </ArtboardStage>
    )
  }

  if (opened.status === 'error') {
    return (
      <ArtboardStage contentKey={`error:${opened.fileName}:${opened.problem}`} placement="center">
        <div {...stylex.props(board.artboard, board.card, board.message, stage.sheet)} role="alert">
          <h1 {...stylex.props(board.title, board.alertTitle)}>{t('cannotShowFile')}</h1>
          <p {...stylex.props(board.copy)}>{problemText(opened.problem, opened.fileName)}</p>
          <Button {...stylex.props(board.button)} onClick={requestImageFilePicker}>
            {t('chooseAnotherFile')}
          </Button>
        </div>
      </ArtboardStage>
    )
  }

  if (opened.status === 'ready') {
    return <ReadyImage fileName={opened.fileName} objectUrl={opened.objectUrl} />
  }

  return (
    <ArtboardStage contentKey="empty" placement="center">
      <div {...stylex.props(board.artboard, board.card, board.message, stage.sheet)}>
        <h1 {...stylex.props(board.title)}>{t('noImageTitle')}</h1>
        <p {...stylex.props(board.copy)}>{t('emptyArtboard', { formats: imageFormats() })}</p>
        <Button {...stylex.props(board.button)} onClick={requestImageFilePicker}>
          {t('openImage')}
        </Button>
      </div>
    </ArtboardStage>
  )
}

function TiffConversion({ fileName, progress }: { fileName: string; progress: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  const percentLabel = formatPercent(progress)
  const fill = stylex.props(board.progressFill)
  return (
    <ArtboardStage contentKey={`converting:${fileName}`} placement="center">
      <div {...stylex.props(board.artboard, board.card, board.loading, stage.sheet)} aria-busy="true">
        <div {...stylex.props(board.progressBlock)}>
          <div {...stylex.props(board.progressMeta)}>
            <p {...stylex.props(board.kicker, board.progressName)}>{t('converting', { fileName })}</p>
            <p {...stylex.props(board.kicker, board.percent)} aria-hidden="true">
              {percentLabel}
            </p>
          </div>
          <div
            {...stylex.props(board.progressTrack)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={percentLabel}
            aria-label={t('converting', { fileName })}
          >
            <div
              className={fill.className}
              style={{ ...fill.style, width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </ArtboardStage>
  )
}

function ReadyImage({ fileName, objectUrl }: { fileName: string; objectUrl: string }) {
  const { actions } = useViewport()
  useEffect(() => {
    return () => {
      clearLines()
    }
  }, [objectUrl])
  return (
    <ArtboardStage contentKey={objectUrl} placement="fit" navigator>
      <div {...stylex.props(board.artboard, board.imageFrame)}>
        <img
          key={objectUrl}
          {...stylex.props(board.image)}
          src={objectUrl}
          alt={fileName || t('openedImage')}
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget
            if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return
            actions.resizeContent(objectUrl, image.naturalWidth, image.naturalHeight, 'fit')
          }}
        />
      </div>
    </ArtboardStage>
  )
}

function problemText(problem: ImageProblem, fileName: string): string {
  if (problem === 'not-a-picture') {
    return t('notAPicture', { fileName, formats: imageFormats() })
  }
  return t('cannotDecode', { fileName })
}
