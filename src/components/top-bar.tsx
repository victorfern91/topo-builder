import * as stylex from '@stylexjs/stylex'
import { Button } from '@base-ui/react/button'
import { Menu } from '@base-ui/react/menu'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, type ChangeEvent, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { formatPixelSize, formatScale, t } from '../i18n/index.ts'
import { a11y } from '../styles/a11y.ts'
import { color, media } from '../styles/tokens.stylex.ts'
import {
  DRAW_SCALE_MAX,
  DRAW_SCALE_MIN,
  drawScaleFromRatio,
  drawScaleRatio,
  lineStore,
  setDrawScale,
} from '../state/lines.ts'
import {
  IMAGE_FILE_ACCEPT,
  imageDocumentStore,
  openImageFile,
  registerImageFilePicker,
  requestImageFilePicker,
} from '../state/image-document.ts'

export function TopBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const fileName = useSelector(imageDocumentStore, (state) => state.fileName)
  const size = useSelector(imageDocumentStore, (state) => state.size)
  const shortcutLabel = applePlatform() ? '⌘O' : 'Ctrl+O'
  const imageReady = useSelector(imageDocumentStore, (state) => state.status === 'ready')
  const scale = useSelector(lineStore, (state) => state.scale)

  useEffect(() => {
    document.title = fileName ? t('documentTitle', { fileName }) : t('appTitle')
  }, [fileName])

  useEffect(() => {
    return registerImageFilePicker(() => {
      inputRef.current?.click()
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'o') {
        return
      }
      const target = event.target
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== 'file')
      ) {
        return
      }
      event.preventDefault()
      inputRef.current?.click()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) openImageFile(file)
  }

  return (
    <header {...stylex.props(styles.topbar)}>
      <div {...stylex.props(styles.brand)}>
        <span {...stylex.props(styles.brandMark)} aria-hidden="true" />
        Topo
      </div>
      <Menu.Root>
        <Menu.Trigger {...stylex.props(styles.barButton)}>{t('file')}</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner {...stylex.props(styles.positioner)} sideOffset={6} align="start">
            <Menu.Popup {...stylex.props(styles.popup)}>
              <Menu.Item
                {...stylex.props(styles.menuItem, stylex.defaultMarker())}
                onClick={() => inputRef.current?.click()}
              >
                <span>{t('openEllipsis')}</span>
                <span {...stylex.props(styles.kbd)}>{shortcutLabel}</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {imageReady ? <ScaleBar scale={scale} /> : null}
      <p {...stylex.props(styles.docTitle)} title={fileName ?? undefined}>
        {fileName ?? t('noDocument')}
      </p>
      <div {...stylex.props(styles.spacer)} />
      {size ? (
        <p {...stylex.props(styles.dimensions)}>{formatPixelSize(size.width, size.height)}</p>
      ) : null}
      <Button {...stylex.props(styles.barButton, styles.primary)} onClick={requestImageFilePicker}>
        {t('open')}
      </Button>
      <input
        {...stylex.props(a11y.visuallyHidden)}
        ref={inputRef}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        aria-label={t('chooseImage')}
        onChange={onFileChange}
      />
    </header>
  )
}

function ScaleBar({ scale }: { scale: number }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const fill = stylex.props(styles.scaleFill)
  const ratio = drawScaleRatio(scale)

  const setFromClientX = (clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return
    setDrawScale(drawScaleFromRatio((clientX - rect.left) / rect.width))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setFromClientX(event.clientX)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setFromClientX(event.clientX)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setDrawScale(drawScaleFromRatio(ratio + step))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setDrawScale(drawScaleFromRatio(ratio - step))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setDrawScale(DRAW_SCALE_MIN)
    } else if (event.key === 'End') {
      event.preventDefault()
      setDrawScale(DRAW_SCALE_MAX)
    }
  }

  return (
    <div {...stylex.props(styles.scaleControl)}>
      <span {...stylex.props(styles.scaleLabel)}>{t('scale')}</span>
      <div
        {...stylex.props(styles.scaleTrack)}
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t('scale')}
        aria-orientation="horizontal"
        aria-valuemin={Math.round(DRAW_SCALE_MIN * 100)}
        aria-valuemax={Math.round(DRAW_SCALE_MAX * 100)}
        aria-valuenow={Math.round(scale * 100)}
        aria-valuetext={formatScale(scale)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <span {...stylex.props(styles.scaleGroove)} aria-hidden="true">
          <span className={fill.className} style={{ ...fill.style, width: `${ratio * 100}%` }} />
        </span>
      </div>
      <span {...stylex.props(styles.scaleReadout)}>{formatScale(scale)}</span>
    </div>
  )
}

function applePlatform(): boolean {
  return /\b(Mac|iPhone|iPad|iPod)\b/i.test(navigator.userAgent)
}

const styles = stylex.create({
  topbar: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    height: {
      default: 42,
      [media.narrow]: 'auto',
    },
    minHeight: {
      default: null,
      [media.narrow]: 42,
    },
    paddingBlock: {
      default: 0,
      [media.narrow]: 6,
    },
    paddingInline: 8,
    rowGap: {
      default: null,
      [media.narrow]: 2,
    },
    flexWrap: {
      default: 'nowrap',
      [media.narrow]: 'wrap',
    },
    backgroundColor: color.bar,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.barLine,
    color: color.text,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 4,
    paddingRight: 8,
    fontSize: 14,
    fontWeight: 650,
    letterSpacing: '0.01em',
  },
  brandMark: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: color.primary,
    backgroundImage: 'linear-gradient(#fff, #fff)',
    backgroundPosition: 'center',
    backgroundSize: '10px 8px',
    backgroundRepeat: 'no-repeat',
    boxShadow: '0 0 0 1px #0b0b0b',
  },
  barButton: {
    appearance: 'none',
    borderWidth: 0,
    backgroundColor: {
      default: 'transparent',
      ':hover': 'rgba(255, 255, 255, 0.08)',
      '[data-popup-open]': 'rgba(255, 255, 255, 0.08)',
    },
    color: 'inherit',
    height: 28,
    paddingBlock: 0,
    paddingInline: 10,
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
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
      ':focus-visible': color.focus,
    },
    outlineOffset: 1,
  },
  primary: {
    backgroundColor: {
      default: color.primary,
      ':hover': color.primaryHover,
    },
    color: '#ffffff',
    marginLeft: 4,
  },
  docTitle: {
    position: {
      default: 'absolute',
      [media.narrow]: 'static',
    },
    left: {
      default: '50%',
      [media.narrow]: 'auto',
    },
    order: {
      default: 0,
      [media.narrow]: 5,
    },
    flexGrow: {
      default: 0,
      [media.narrow]: 1,
    },
    flexShrink: 0,
    flexBasis: {
      default: 'auto',
      [media.narrow]: '100%',
    },
    maxWidth: {
      default: 'min(46vw, 420px)',
      [media.narrow]: '100%',
    },
    margin: 0,
    transform: {
      default: 'translateX(-50%)',
      [media.narrow]: 'none',
    },
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 13,
    color: color.doc,
    pointerEvents: {
      default: 'none',
      [media.narrow]: 'auto',
    },
    paddingTop: {
      default: 0,
      [media.narrow]: 2,
    },
    paddingBottom: {
      default: 0,
      [media.narrow]: 4,
    },
    paddingInline: {
      default: 0,
      [media.narrow]: 4,
    },
    textAlign: {
      default: 'start',
      [media.narrow]: 'left',
    },
  },
  spacer: {
    flexGrow: 1,
    display: {
      default: 'block',
      [media.narrow]: 'none',
    },
  },
  dimensions: {
    margin: 0,
    paddingInline: 8,
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    color: color.kbd,
    whiteSpace: 'nowrap',
  },
  positioner: {
    zIndex: 30,
  },
  popup: {
    minWidth: 220,
    padding: 4,
    backgroundColor: color.menu,
    color: color.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.menuLine,
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    outlineStyle: 'none',
  },
  menuItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 24,
    paddingBlock: 6,
    paddingInline: 10,
    borderRadius: 4,
    fontSize: 13,
    lineHeight: 1.3,
    cursor: 'default',
    outlineStyle: 'none',
    userSelect: 'none',
    backgroundColor: {
      default: 'transparent',
      '[data-highlighted]': color.primary,
    },
    color: {
      default: 'inherit',
      '[data-highlighted]': '#ffffff',
    },
  },
  kbd: {
    color: {
      default: color.kbd,
      [stylex.when.ancestor('[data-highlighted]')]: 'inherit',
    },
  },
  scaleControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  scaleLabel: {
    fontSize: 13,
    color: color.kbd,
  },
  scaleTrack: {
    display: 'flex',
    alignItems: 'center',
    width: 120,
    height: 22,
    cursor: 'pointer',
    touchAction: 'none',
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
      ':focus-visible': color.focus,
    },
    outlineOffset: 2,
  },
  scaleGroove: {
    display: 'block',
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    pointerEvents: 'none',
  },
  scaleFill: {
    display: 'block',
    height: '100%',
    borderRadius: 4,
    backgroundColor: color.primary,
  },
  scaleReadout: {
    width: 42,
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    color: color.kbd,
    textAlign: 'end',
  },
})
