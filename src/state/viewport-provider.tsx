import { useEffect, useMemo, type ReactNode } from 'react'
import { t } from '../i18n/index.ts'
import { viewportContext } from './viewport-context.ts'
import {
  matchViewportKey,
  shortcutChords,
  viewportStore,
  type ViewportContextValue,
} from './viewport.ts'

export function ViewportProvider({ children }: { children: ReactNode }) {
  const keys = useMemo(() => shortcutChords(t('spaceKey')), [])

  useEffect(() => {
    const { actions } = viewportStore

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || isTextEntry(event.target)) return
      if (event.key === ' ' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.target instanceof HTMLButtonElement) return
        event.preventDefault()
        if (!event.repeat) actions.setSpaceHeld(true)
        return
      }
      const key = matchViewportKey(event)
      if (!key) return
      event.preventDefault()
      if (event.repeat && (key === 'fit' || key === 'actual-size')) return
      if (key === 'zoom-in') actions.zoomIn()
      else if (key === 'zoom-out') actions.zoomOut()
      else if (key === 'fit') actions.fit()
      else actions.actualSize()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') actions.setSpaceHeld(false)
    }

    const onBlur = () => {
      actions.setSpaceHeld(false)
      if (viewportStore.get().userAction === 'pan') actions.setUserAction('idle')
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      actions.setSpaceHeld(false)
    }
  }, [])

  const value = useMemo<ViewportContextValue>(
    () => ({
      actions: viewportStore.actions,
      keys,
      getState: viewportStore.get,
    }),
    [keys],
  )

  return <viewportContext.StoreProvider value={value}>{children}</viewportContext.StoreProvider>
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (!(target instanceof HTMLInputElement)) return false
  return target.type !== 'range' && target.type !== 'file' && target.type !== 'button' && target.type !== 'checkbox'
}
