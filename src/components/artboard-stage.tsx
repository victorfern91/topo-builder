import * as stylex from '@stylexjs/stylex'
import { shallow } from '@tanstack/store'
import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { t } from '../i18n/index.ts'
import { wheelDelta, zoomFactorFromWheel, type ContentPlacement } from '../state/viewport.ts'
import { useViewport, useViewportSelector } from '../state/use-viewport.ts'
import { stage } from '../styles/stage.ts'
import { NavigatorPanel } from './navigator-panel.tsx'

type ArtboardStageProps = {
  contentKey: string
  placement: ContentPlacement
  navigator?: boolean
  children: ReactNode
}

type StageMotion = {
  zoom: number
  panX: number
  panY: number
  grab: boolean
  grabbing: boolean
  placed: boolean
  crisp: boolean
}

export function ArtboardStage({ contentKey, placement, navigator = true, children }: ArtboardStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null)
  const { actions, getState } = useViewport()
  const motion = useViewportSelector(
    (state): StageMotion => ({
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      grabbing: state.userAction === 'pan',
      grab: state.spaceHeld && state.userAction !== 'pan',
      placed: state.fittedKey === contentKey && contentKey !== '',
      crisp: state.zoom >= 3,
    }),
    { compare: shallow },
  )

  useLayoutEffect(() => {
    const node = stageRef.current
    if (!node) return
    const publish = () => {
      actions.resizeView(node.clientWidth, node.clientHeight)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)
    return () => observer.disconnect()
  }, [actions])

  useLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return
    const publish = () => {
      actions.resizeContent(contentKey, node.offsetWidth, node.offsetHeight, placement)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)
    return () => observer.disconnect()
  }, [actions, contentKey, placement])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      const target = event.target
      const onNavigator = target instanceof Element && Boolean(target.closest('[data-navigator]'))
      event.preventDefault()
      const zooming = onNavigator || event.ctrlKey || event.metaKey || event.altKey
      if (zooming) {
        const rect = node.getBoundingClientRect()
        const origin = onNavigator
          ? 'center'
          : { x: event.clientX - rect.left, y: event.clientY - rect.top }
        actions.zoomBy(zoomFactorFromWheel(event.deltaY, event.deltaMode), origin)
        return
      }
      actions.panBy(
        -wheelDelta(event.deltaX, event.deltaMode),
        -wheelDelta(event.deltaY, event.deltaMode),
      )
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [actions])

  const endDrag = (pointerId: number) => {
    if (!dragRef.current || dragRef.current.id !== pointerId) return
    dragRef.current = null
    if (getState().userAction === 'pan') actions.setUserAction('idle')
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return
    if (isNavigatorTarget(event.target) || isInteractiveTarget(event.target)) return
    const hand = event.button === 1 || event.pointerType === 'touch' || getState().spaceHeld
    if (!hand) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    actions.setUserAction('pan')
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    drag.x = event.clientX
    drag.y = event.clientY
    actions.panBy(dx, dy)
  }

  const root = stylex.props(stage.root)
  const content = stylex.props(stage.content)

  return (
    <div
      {...root}
      ref={stageRef}
      role="region"
      aria-label={t('artboard')}
      aria-keyshortcuts="Control+Equal Control+Minus Control+Digit0 Control+Digit1 Space"
      data-grab={motion.grab ? '' : undefined}
      data-grabbing={motion.grabbing ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endDrag(event.pointerId)}
      onPointerCancel={(event) => endDrag(event.pointerId)}
      onLostPointerCapture={(event) => endDrag(event.pointerId)}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        ref={contentRef}
        className={content.className}
        data-crisp={motion.crisp ? '' : undefined}
        style={{
          ...content.style,
          transform: `translate3d(${motion.panX}px, ${motion.panY}px, 0) scale(${motion.zoom})`,
          visibility: motion.placed ? 'visible' : 'hidden',
        }}
      >
        {children}
      </div>
      {navigator ? <NavigatorPanel /> : null}
    </div>
  )
}

function isNavigatorTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-navigator]'))
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest('button, a, input, textarea, select, label'))
  )
}
