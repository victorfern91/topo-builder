import * as stylex from '@stylexjs/stylex'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { t } from '../i18n/index.ts'
import type { MessageId } from '../i18n/messages.ts'
import { drawPointMark, POINT_MARKS, type PointMark } from '../state/point-marks.ts'
import { isPlainDelete } from '../state/viewport.ts'
import { color } from '../styles/tokens.stylex.ts'

export type PointMenuState = {
  x: number
  y: number
  layerId: string
  deleteIndex: number | null
  insert: { index: number; x: number; y: number } | null
}

const MARK_LABEL = {
  bolt: 'boltMark',
  ring: 'ringMark',
  belay: 'belayMark',
  rappel: 'rappelMark',
} as const satisfies Record<PointMark, MessageId>

type PointMenuProps = {
  x: number
  y: number
  mark: PointMark | null
  onDelete: (() => void) | null
  onAdd: (() => void) | null
  onMark: ((mark: PointMark) => void) | null
  onClose: () => void
}

export function PointMenu({ x, y, mark, onDelete, onAdd, onMark, onClose }: PointMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const focusRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const rect = menu.getBoundingClientRect()
    const pad = 8
    const left = Math.min(Math.max(pad, x), window.innerWidth - rect.width - pad)
    const top = Math.min(Math.max(pad, y), window.innerHeight - rect.height - pad)
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
  }, [x, y])

  useLayoutEffect(() => {
    focusRef.current?.focus()
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 2) return
      const menu = menuRef.current
      if (menu && event.target instanceof Node && menu.contains(event.target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (!onDelete || !isPlainDelete(event) || isTypingTarget(event.target)) return
      event.preventDefault()
      onDelete()
    }
    const onWheel = () => onClose()
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel, true)
    }
  }, [onClose, onDelete])

  const menu = stylex.props(styles.menu)

  return (
    <div
      {...menu}
      ref={menuRef}
      role="menu"
      data-point-menu=""
      aria-label={t('pointMenu')}
      style={{ ...menu.style, left: x, top: y }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      {onMark ? (
        <div {...stylex.props(styles.marks)} role="group" aria-label={t('pointMarks')}>
          {POINT_MARKS.map((id) => {
            const pressed = mark === id
            const focusHere = pressed || (mark === null && id === POINT_MARKS[0] && !onDelete)
            return (
              <button
                key={id}
                {...stylex.props(styles.mark)}
                ref={focusHere ? focusRef : undefined}
                type="button"
                role="menuitemcheckbox"
                aria-checked={pressed}
                aria-label={t(MARK_LABEL[id])}
                title={t(MARK_LABEL[id])}
                data-selected={pressed ? '' : undefined}
                onClick={() => onMark(id)}
              >
                <MarkIcon mark={id} />
              </button>
            )
          })}
        </div>
      ) : null}
      {onAdd ? (
        <button {...stylex.props(styles.item)} ref={onDelete ? undefined : focusRef} type="button" role="menuitem" onClick={onAdd}>
          {t('addPoint')}
        </button>
      ) : null}
      {onDelete ? (
        <button {...stylex.props(styles.item)} ref={mark ? undefined : focusRef} type="button" role="menuitem" onClick={onDelete}>
          {t('deletePoint')}
        </button>
      ) : null}
    </div>
  )
}

function MarkIcon({ mark }: { mark: PointMark }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = 22
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    ctx.translate(size / 2, size / 2)
    drawPointMark(ctx, mark, 8, 1)
  }, [mark])
  return <canvas {...stylex.props(styles.icon)} ref={ref} width={22} height={22} aria-hidden="true" />
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

const styles = stylex.create({
  menu: {
    position: 'fixed',
    zIndex: 40,
    minWidth: 160,
    padding: 4,
    backgroundColor: color.menu,
    color: color.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.menuLine,
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
  item: {
    appearance: 'none',
    display: 'block',
    width: '100%',
    paddingBlock: 6,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: {
      default: 'transparent',
      ':hover': color.primary,
      ':focus-visible': color.primary,
    },
    color: {
      default: 'inherit',
      ':hover': '#ffffff',
      ':focus-visible': '#ffffff',
    },
    fontSize: 13,
    lineHeight: 1.3,
    textAlign: 'start',
    cursor: 'pointer',
    outlineStyle: 'none',
  },
  marks: {
    display: 'flex',
    gap: 4,
    padding: 2,
  },
  mark: {
    appearance: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    padding: 0,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: {
      default: 'transparent',
      ':hover': color.primary,
      ':focus-visible': color.primary,
      '[data-selected]': color.primary,
    },
    cursor: 'pointer',
    outlineStyle: 'none',
  },
  icon: {
    display: 'block',
    width: 22,
    height: 22,
  },
})
