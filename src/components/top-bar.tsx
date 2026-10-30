import * as stylex from '@stylexjs/stylex'
import { Button } from '@base-ui/react/button'
import { Menu } from '@base-ui/react/menu'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, type ChangeEvent } from 'react'
import { formatPixelSize, t } from '../i18n/index.ts'
import { a11y } from '../styles/a11y.ts'
import { color, media } from '../styles/tokens.stylex.ts'
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
})
