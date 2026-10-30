import * as stylex from '@stylexjs/stylex'
import { shallow } from '@tanstack/store'
import { useSelector } from '@tanstack/react-store'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { t } from '../i18n/index.ts'
import type { MessageId } from '../i18n/messages.ts'
import { imageDocumentStore } from '../state/image-document.ts'
import {
  applyToolClick,
  selectGroup,
  selectZoom,
  toolStore,
  ZOOM_COMMANDS,
  ZOOM_TOOLS,
  type ZoomCommandId,
  type ZoomToolId,
} from '../state/tools.ts'
import { useViewport, useViewportSelector } from '../state/use-viewport.ts'
import type { ViewportKeyId } from '../state/viewport.ts'
import { color } from '../styles/tokens.stylex.ts'

const ZOOM_TOOL_OPTIONS: { id: ZoomToolId; label: MessageId; shortcut: ViewportKeyId }[] = [
  { id: 'zoom-in', label: 'zoomIn', shortcut: 'zoom-in' },
  { id: 'zoom-out', label: 'zoomOut', shortcut: 'zoom-out' },
]

const ZOOM_COMMAND_OPTIONS: { id: ZoomCommandId; label: MessageId; shortcut: ViewportKeyId }[] = [
  { id: 'fit', label: 'fitWindow', shortcut: 'fit' },
  { id: 'actual-size', label: 'actualSize', shortcut: 'actual-size' },
]

const DRAG_SLOP = 3

export function ToolSidebar() {
  const ready = useSelector(imageDocumentStore, (state) => state.status === 'ready')
  const group = useSelector(toolStore, (state) => state.group)
  const zoom = useSelector(toolStore, (state) => state.zoom)
  const { actions, keys, getState } = useViewport()
  const placement = useViewportSelector(
    (state) => ({
      x: state.toolX,
      y: state.toolY,
      placed: state.viewWidth > 0,
      dragging: state.userAction === 'tools',
    }),
    { compare: shallow },
  )
  const [open, setOpen] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const dragRef = useRef<{
    id: number
    x: number
    y: number
    toolX: number
    toolY: number
    moved: boolean
  } | null>(null)
  const menuId = useId()
  const zoomOption = ZOOM_TOOL_OPTIONS.find((item) => item.id === zoom) ?? ZOOM_TOOL_OPTIONS[0]

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    }
  }, [])

  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const publish = () => {
      actions.resizeTool(rail.offsetWidth, rail.offsetHeight)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(rail)
    return () => observer.disconnect()
  }, [actions, ready])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      const slot = slotRef.current
      if (!slot || !(event.target instanceof Node) || slot.contains(event.target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  if (!ready) return null

  const cancelClose = () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 160)
  }

  const runCommand = (id: ZoomCommandId) => {
    setOpen(false)
    applyToolClick(id, actions, 'center')
  }

  const endDrag = (pointerId: number) => {
    const drag = dragRef.current
    if (!drag || drag.id !== pointerId) return
    dragRef.current = null
    if (drag.moved) actions.dropTool()
    if (getState().userAction === 'tools') actions.setUserAction('idle')
  }

  const onGripPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const state = getState()
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      toolX: state.toolX,
      toolY: state.toolY,
      moved: false,
    }
  }

  const onGripPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_SLOP) return
    drag.moved = true
    if (getState().userAction !== 'tools') actions.setUserAction('tools')
    actions.moveTool(drag.toolX + dx, drag.toolY + dy)
  }

  const onGripKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8
    const state = getState()
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      actions.moveTool(state.toolX - step, state.toolY)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      actions.moveTool(state.toolX + step, state.toolY)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      actions.moveTool(state.toolX, state.toolY - step)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      actions.moveTool(state.toolX, state.toolY + step)
    }
  }

  const rail = stylex.props(styles.rail)

  return (
      <div
        {...rail}
        ref={railRef}
        data-tools=""
        data-dragging={placement.dragging ? '' : undefined}
        role="toolbar"
        aria-label={t('tools')}
        style={{
          ...rail.style,
          transform: `translate3d(${placement.x}px, ${placement.y}px, 0)`,
          visibility: placement.placed ? 'visible' : 'hidden',
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div
          {...stylex.props(styles.gripBar)}
          data-dragging={placement.dragging ? '' : undefined}
          role="application"
          tabIndex={0}
          aria-label={t('dragTools')}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={(event) => endDrag(event.pointerId)}
          onPointerCancel={(event) => endDrag(event.pointerId)}
          onLostPointerCapture={(event) => endDrag(event.pointerId)}
          onKeyDown={onGripKeyDown}
        >
          <span {...stylex.props(styles.grip)} aria-hidden="true" />
        </div>
        <button
          {...stylex.props(styles.tool)}
          type="button"
          aria-label={t('moveView')}
          aria-pressed={group === 'move'}
          data-pressed={group === 'move' ? '' : undefined}
          title={`${t('moveView')} (${keys.pan})`}
          onClick={() => {
            setOpen(false)
            selectGroup('move')
          }}
        >
          <MoveIcon />
        </button>
        <div
          {...stylex.props(styles.slot)}
          ref={slotRef}
          onMouseLeave={scheduleClose}
          onMouseEnter={cancelClose}
        >
          <button
            {...stylex.props(styles.tool)}
            type="button"
            aria-label={t(zoomOption.label)}
            aria-pressed={group === 'zoom'}
            data-pressed={group === 'zoom' ? '' : undefined}
            title={`${t(zoomOption.label)} (${keys[zoomOption.shortcut]})`}
            onClick={() => {
              setOpen(false)
              selectGroup('zoom')
              applyToolClick(zoom, actions, 'center')
            }}
          >
            <ZoomToolIcon id={zoom} />
          </button>
          <button
            {...stylex.props(styles.triangle)}
            type="button"
            aria-label={t('zoomOptions')}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onMouseEnter={() => {
              cancelClose()
              setOpen(true)
            }}
            onClick={(event) => {
              event.preventDefault()
              cancelClose()
              setOpen(true)
            }}
          >
            <span {...stylex.props(styles.triangleMark)} />
          </button>
          {open ? (
            <div {...stylex.props(styles.menu)} id={menuId} role="menu" aria-label={t('zoomOptions')}>
              <div {...stylex.props(styles.popup)}>
                {ZOOM_TOOLS.map((id) => (
                  <ZoomChoice
                    key={id}
                    id={id}
                    keys={keys}
                    checked={id === zoom}
                    onSelect={() => {
                      selectZoom(id)
                      setOpen(false)
                    }}
                  />
                ))}
                <div {...stylex.props(styles.rule)} />
                {ZOOM_COMMANDS.map((id) => (
                  <CommandChoice key={id} id={id} keys={keys} onRun={() => runCommand(id)} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
  )
}

function ZoomChoice({
  id,
  keys,
  checked,
  onSelect,
}: {
  id: ZoomToolId
  keys: Record<ViewportKeyId, string>
  checked: boolean
  onSelect: () => void
}) {
  const option = ZOOM_TOOL_OPTIONS.find((item) => item.id === id)
  if (!option) return null
  return (
    <button
      {...stylex.props(styles.item)}
      type="button"
      role="option"
      aria-selected={checked}
      data-checked={checked ? '' : undefined}
      onClick={onSelect}
    >
      <span {...stylex.props(styles.itemIcon)}>
        <ZoomToolIcon id={id} />
      </span>
      <span {...stylex.props(styles.itemLabel)}>{t(option.label)}</span>
      <span {...stylex.props(styles.kbd)}>{keys[option.shortcut]}</span>
    </button>
  )
}

function CommandChoice({
  id,
  keys,
  onRun,
}: {
  id: ZoomCommandId
  keys: Record<ViewportKeyId, string>
  onRun: () => void
}) {
  const option = ZOOM_COMMAND_OPTIONS.find((item) => item.id === id)
  if (!option) return null
  return (
    <button {...stylex.props(styles.item)} type="button" onClick={onRun}>
      <span {...stylex.props(styles.itemIcon)}>
        <CommandIcon id={id} />
      </span>
      <span {...stylex.props(styles.itemLabel)}>{t(option.label)}</span>
      <span {...stylex.props(styles.kbd)}>{keys[option.shortcut]}</span>
    </button>
  )
}

function ZoomToolIcon({ id }: { id: ZoomToolId }) {
  if (id === 'zoom-out') return <ZoomOutIcon />
  return <ZoomInIcon />
}

function CommandIcon({ id }: { id: ZoomCommandId }) {
  if (id === 'fit') return <FitIcon />
  return <span {...stylex.props(styles.mark)}>1:1</span>
}

function ZoomInIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8.25" cy="8.25" r="5" />
      <path d="M12.2 12.2 16.4 16.4" />
      <path d="M8.25 5.9v4.7M5.9 8.25h4.7" />
    </svg>
  )
}

function ZoomOutIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8.25" cy="8.25" r="5" />
      <path d="M12.2 12.2 16.4 16.4" />
      <path d="M5.9 8.25h4.7" />
    </svg>
  )
}

function FitIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4.25 8V4.25H8M12 4.25h3.75V8M15.75 12v3.75H12M8 15.75H4.25V12" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 3.2v13.6M3.2 10h13.6" />
      <path d="M10 3.2 7.6 5.6M10 3.2l2.4 2.4M10 16.8l-2.4-2.4M10 16.8l2.4-2.4M3.2 10l2.4-2.4M3.2 10l2.4 2.4M16.8 10l-2.4-2.4M16.8 10l-2.4 2.4" />
    </svg>
  )
}

const styles = stylex.create({
  rail: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    width: 48,
    paddingBottom: 6,
    paddingInline: 6,
    backgroundColor: color.bar,
    color: color.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.menuLine,
    borderRadius: 6,
    boxShadow: {
      default: '0 12px 28px rgba(0, 0, 0, 0.4)',
      '[data-dragging]': '0 18px 40px rgba(0, 0, 0, 0.55)',
    },
    userSelect: 'none',
    touchAction: 'none',
  },
  gripBar: {
    display: 'grid',
    placeItems: 'center',
    width: '100%',
    height: 18,
    marginBottom: 2,
    borderRadius: 4,
    cursor: {
      default: 'grab',
      '[data-dragging]': 'grabbing',
    },
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
  grip: {
    width: 14,
    height: 8,
    opacity: 0.7,
    backgroundImage: 'radial-gradient(currentColor 1.1px, transparent 1.5px)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'center',
  },
  slot: {
    position: 'relative',
  },
  tool: {
    appearance: 'none',
    display: 'grid',
    placeItems: 'center',
    width: 36,
    height: 36,
    padding: 0,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: {
      default: 'transparent',
      ':hover': 'rgba(255, 255, 255, 0.08)',
      '[data-pressed]': 'rgba(20, 115, 230, 0.35)',
    },
    color: 'inherit',
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
      ':focus-visible': color.focus,
    },
    outlineOffset: 1,
  },
  triangle: {
    appearance: 'none',
    position: 'absolute',
    right: 1,
    bottom: 1,
    zIndex: 1,
    display: 'grid',
    placeItems: 'end',
    width: 16,
    height: 16,
    padding: 0,
    borderWidth: 0,
    borderRadius: 2,
    backgroundColor: 'transparent',
    color: 'inherit',
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
      ':focus-visible': color.focus,
    },
    outlineOffset: 1,
  },
  triangleMark: {
    width: 7,
    height: 7,
    marginRight: 2,
    marginBottom: 2,
    backgroundColor: color.kbd,
    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
  },
  menu: {
    position: 'absolute',
    top: 0,
    left: '100%',
    zIndex: 30,
    marginLeft: -10,
    paddingLeft: 10,
  },
  popup: {
    minWidth: 196,
    padding: 4,
    backgroundColor: color.menu,
    color: color.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.menuLine,
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
  rule: {
    height: 1,
    marginBlock: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  item: {
    appearance: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingBlock: 6,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: {
      default: 'transparent',
      ':hover': color.primary,
      '[data-checked]': 'rgba(20, 115, 230, 0.35)',
    },
    color: {
      default: 'inherit',
      ':hover': '#ffffff',
    },
    fontSize: 13,
    lineHeight: 1.3,
    textAlign: 'start',
    cursor: 'pointer',
    outlineStyle: 'none',
  },
  itemIcon: {
    display: 'grid',
    placeItems: 'center',
    width: 20,
    height: 20,
    flexGrow: 0,
    flexShrink: 0,
  },
  itemLabel: {
    flexGrow: 1,
  },
  kbd: {
    color: color.kbd,
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
  },
  icon: {
    width: 20,
    height: 20,
    display: 'block',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  mark: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
})

const iconProps = {
  ...stylex.props(styles.icon),
  viewBox: '0 0 20 20',
  'aria-hidden': true as const,
}
