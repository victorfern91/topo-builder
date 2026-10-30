import * as stylex from '@stylexjs/stylex'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { t } from '../i18n/index.ts'
import { color } from '../styles/tokens.stylex.ts'

export type PointMenuState = {
  x: number
  y: number
  layerId: string
  deleteIndex: number | null
  insert: { index: number; x: number; y: number } | null
}

type PointMenuProps = {
  x: number
  y: number
  onDelete: (() => void) | null
  onAdd: (() => void) | null
  onClose: () => void
}

export function PointMenu({ x, y, onDelete, onAdd, onClose }: PointMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)

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
    deleteRef.current?.focus()
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
      if ((event.key !== 'Backspace' && event.key !== 'Delete') || !onDelete) return
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
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
      {onAdd ? (
        <button {...stylex.props(styles.item)} ref={onDelete ? undefined : deleteRef} type="button" role="menuitem" onClick={onAdd}>
          {t('addPoint')}
        </button>
      ) : null}
      {onDelete ? (
        <button {...stylex.props(styles.item)} ref={deleteRef} type="button" role="menuitem" onClick={onDelete}>
          {t('deletePoint')}
        </button>
      ) : null}
    </div>
  )
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
})
