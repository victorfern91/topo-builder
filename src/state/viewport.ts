import { Store } from '@tanstack/store'
import { flushPreferences, preferencesStore, saveNavigator, saveTools } from './preferences.ts'

export const MIN_ZOOM = 0.01
export const MAX_ZOOM = 64
export const ZOOM_STEP = 1.25
const PANEL_MARGIN = 12
const VIEW_MARGIN = 32
const DOCK_SNAP = 28

export type UserAction = 'idle' | 'pan' | 'minimap' | 'panel' | 'tools'

export type ContentPlacement = 'fit' | 'center'

export type ZoomOrigin = { x: number; y: number } | 'center'

export type ViewportKeyId = 'zoom-in' | 'zoom-out' | 'fit' | 'actual-size' | 'pan'

export type ViewportKeys = Record<ViewportKeyId, string>

export type ViewportState = {
  zoom: number
  panX: number
  panY: number
  viewWidth: number
  viewHeight: number
  contentWidth: number
  contentHeight: number
  contentKey: string
  placement: ContentPlacement
  fittedKey: string
  spaceHeld: boolean
  userAction: UserAction
  panelX: number
  panelY: number
  panelWidth: number
  panelHeight: number
  panelCustom: boolean
  toolX: number
  toolY: number
  toolWidth: number
  toolHeight: number
  toolCustom: boolean
}

export type MinimapLayout = {
  scale: number
  contentX: number
  contentY: number
  contentW: number
  contentH: number
  frameX: number
  frameY: number
  frameW: number
  frameH: number
}

const initialViewport: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  viewWidth: 0,
  viewHeight: 0,
  contentWidth: 0,
  contentHeight: 0,
  contentKey: '',
  placement: 'center',
  fittedKey: '',
  spaceHeld: false,
  userAction: 'idle',
  panelX: PANEL_MARGIN,
  panelY: PANEL_MARGIN,
  panelWidth: 216,
  panelHeight: 248,
  panelCustom: false,
  toolX: PANEL_MARGIN,
  toolY: PANEL_MARGIN,
  toolWidth: 48,
  toolHeight: 120,
  toolCustom: false,
}

export const viewportStore = new Store(initialViewport, (store) => ({
  zoomBy(factor: number, origin: ZoomOrigin = 'center') {
    store.setState((state) => zoomAt(state, state.zoom * factor, origin))
  },
  zoomTo(zoom: number, origin: ZoomOrigin = 'center') {
    store.setState((state) => zoomAt(state, zoom, origin))
  },
  zoomIn() {
    store.setState((state) => zoomAt(state, state.zoom * ZOOM_STEP, 'center'))
  },
  zoomOut() {
    store.setState((state) => zoomAt(state, state.zoom / ZOOM_STEP, 'center'))
  },
  fit() {
    store.setState((state) => placeFitted(state))
  },
  actualSize() {
    store.setState((state) => zoomAt(state, 1, 'center'))
  },
  panBy(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return
    store.setState((state) => ({ ...state, panX: state.panX + dx, panY: state.panY + dy }))
  },
  centerOn(contentX: number, contentY: number) {
    store.setState((state) => ({
      ...state,
      panX: state.viewWidth / 2 - contentX * state.zoom,
      panY: state.viewHeight / 2 - contentY * state.zoom,
    }))
  },
  setSpaceHeld(held: boolean) {
    store.setState((state) => (state.spaceHeld === held ? state : { ...state, spaceHeld: held }))
  },
  setUserAction(userAction: UserAction) {
    store.setState((state) =>
      state.userAction === userAction ? state : { ...state, userAction },
    )
  },
  resizeView(width: number, height: number) {
    store.setState((state) => resizeView(state, width, height))
  },
  resizeContent(key: string, width: number, height: number, placement: ContentPlacement) {
    store.setState((state) => resizeContent(state, key, width, height, placement))
  },
  resizePanel(width: number, height: number) {
    store.setState((state) => {
      if (state.panelWidth === width && state.panelHeight === height) return state
      return clampPanel({ ...state, panelWidth: width, panelHeight: height })
    })
  },
  movePanel(x: number, y: number) {
    store.setState((state) => {
      const next = clampPanel({ ...state, panelX: x, panelY: y, panelCustom: true })
      rememberPanel(next)
      return next
    })
  },
  dropPanel() {
    store.setState((state) => {
      if (!state.panelCustom) return state
      const docked = dockedPanelPosition(state)
      const near = Math.abs(state.panelX - docked.x) <= DOCK_SNAP && Math.abs(state.panelY - docked.y) <= DOCK_SNAP
      if (!near) return state
      const next = clampPanel({ ...state, panelCustom: false })
      rememberPanel(next)
      return next
    })
    flushPreferences()
  },
  resizeTool(width: number, height: number) {
    store.setState((state) => {
      if (state.toolWidth === width && state.toolHeight === height) return state
      return clampTool({ ...state, toolWidth: width, toolHeight: height })
    })
  },
  moveTool(x: number, y: number) {
    store.setState((state) => {
      const next = clampTool({ ...state, toolX: x, toolY: y, toolCustom: true })
      rememberTool(next)
      return next
    })
  },
  dropTool() {
    store.setState((state) => {
      if (!state.toolCustom) return state
      const docked = dockedToolPosition()
      const near = Math.abs(state.toolX - docked.x) <= DOCK_SNAP && Math.abs(state.toolY - docked.y) <= DOCK_SNAP
      if (!near) return state
      const next = clampTool({ ...state, toolCustom: false })
      rememberTool(next)
      return next
    })
    flushPreferences()
  },
}))

export type ViewportActions = typeof viewportStore.actions

export type ViewportContextValue = {
  actions: ViewportActions
  keys: ViewportKeys
  getState: () => ViewportState
}

export function shortcutChords(panLabel: string): ViewportKeys {
  const apple = /\b(Mac|iPhone|iPad|iPod)\b/i.test(navigator.userAgent)
  if (apple) {
    return {
      'zoom-in': '⌘+',
      'zoom-out': '⌘−',
      fit: '⌘0',
      'actual-size': '⌘1',
      pan: panLabel,
    }
  }
  return {
    'zoom-in': 'Ctrl++',
    'zoom-out': 'Ctrl+−',
    fit: 'Ctrl+0',
    'actual-size': 'Ctrl+1',
    pan: panLabel,
  }
}

export function matchViewportKey(event: KeyboardEvent): Exclude<ViewportKeyId, 'pan'> | null {
  if (event.isComposing || event.altKey) return null
  if (!(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey)) return null
  if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') return 'zoom-in'
  if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') return 'zoom-out'
  if (event.shiftKey) return null
  if (event.key === '0' || event.code === 'Numpad0') return 'fit'
  if (event.key === '1' || event.code === 'Numpad1') return 'actual-size'
  return null
}

export function wheelDelta(delta: number, mode: number): number {
  if (mode === WheelEvent.DOM_DELTA_LINE) return delta * 16
  if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * 240
  return delta
}

export function zoomFactorFromWheel(deltaY: number, mode: number): number {
  return Math.exp(-wheelDelta(deltaY, mode) * 0.0018)
}

export function formatZoomPercent(zoom: number): string {
  const percent = zoom * 100
  if (percent >= 10) return `${Math.round(percent)}%`
  return `${percent.toFixed(1)}%`
}

export function zoomToSlider(zoom: number): number {
  const span = Math.log(MAX_ZOOM / MIN_ZOOM)
  const t = Math.log(clampZoom(zoom) / MIN_ZOOM) / span
  return Math.round(t * 1000)
}

export function sliderToZoom(value: number): number {
  const t = value / 1000
  return clampZoom(MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, t))
}

export function minimapLayout(state: ViewportState, width: number, height: number): MinimapLayout | null {
  const { contentWidth, contentHeight, zoom, panX, panY, viewWidth, viewHeight } = state
  if (contentWidth <= 0 || contentHeight <= 0 || zoom <= 0 || width <= 0 || height <= 0) return null
  const scale = Math.min(width / contentWidth, height / contentHeight)
  const contentW = contentWidth * scale
  const contentH = contentHeight * scale
  const contentX = (width - contentW) / 2
  const contentY = (height - contentH) / 2
  return {
    scale,
    contentX,
    contentY,
    contentW,
    contentH,
    frameX: contentX + (-panX / zoom) * scale,
    frameY: contentY + (-panY / zoom) * scale,
    frameW: (viewWidth / zoom) * scale,
    frameH: (viewHeight / zoom) * scale,
  }
}

export function pointInFrame(layout: MinimapLayout, x: number, y: number): boolean {
  return (
    x >= layout.frameX &&
    y >= layout.frameY &&
    x <= layout.frameX + layout.frameW &&
    y <= layout.frameY + layout.frameH
  )
}

export function minimapToContent(layout: MinimapLayout, x: number, y: number): { x: number; y: number } {
  return {
    x: (x - layout.contentX) / layout.scale,
    y: (y - layout.contentY) / layout.scale,
  }
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

function zoomAt(state: ViewportState, zoom: number, origin: ZoomOrigin): ViewportState {
  const nextZoom = clampZoom(zoom)
  if (nextZoom === state.zoom) return state
  const ox = origin === 'center' ? state.viewWidth / 2 : origin.x
  const oy = origin === 'center' ? state.viewHeight / 2 : origin.y
  const ratio = nextZoom / state.zoom
  return {
    ...state,
    zoom: nextZoom,
    panX: ox - (ox - state.panX) * ratio,
    panY: oy - (oy - state.panY) * ratio,
  }
}

function placeFitted(state: ViewportState): ViewportState {
  if (state.contentWidth <= 0 || state.contentHeight <= 0 || state.viewWidth <= 0 || state.viewHeight <= 0) {
    return state
  }
  return placeInView(state, Number.POSITIVE_INFINITY)
}

function placeCentered(state: ViewportState): ViewportState {
  if (state.contentWidth <= 0 || state.contentHeight <= 0 || state.viewWidth <= 0 || state.viewHeight <= 0) {
    return state
  }
  return placeInView(state, 1)
}

function placeInView(state: ViewportState, zoomCap: number): ViewportState {
  const reserveLeft = state.toolCustom ? 0 : state.toolWidth + PANEL_MARGIN
  const reserveRight = state.panelCustom ? 0 : state.panelWidth + PANEL_MARGIN
  const availW = Math.max(1, state.viewWidth - reserveLeft - reserveRight - VIEW_MARGIN * 2)
  const availH = Math.max(1, state.viewHeight - VIEW_MARGIN * 2)
  const zoom = clampZoom(Math.min(zoomCap, availW / state.contentWidth, availH / state.contentHeight))
  const usedW = state.viewWidth - reserveLeft - reserveRight
  const next = {
    ...state,
    zoom,
    panX: reserveLeft + (usedW - state.contentWidth * zoom) / 2,
    panY: (state.viewHeight - state.contentHeight * zoom) / 2,
  }
  if (next.zoom === state.zoom && next.panX === state.panX && next.panY === state.panY) return state
  return next
}

function resizeView(state: ViewportState, width: number, height: number): ViewportState {
  if (width === state.viewWidth && height === state.viewHeight) return state
  const next = clampTool(clampPanel({ ...state, viewWidth: width, viewHeight: height }))
  if (next.fittedKey === next.contentKey) return next
  return tryPlace(next)
}

function resizeContent(
  state: ViewportState,
  key: string,
  width: number,
  height: number,
  placement: ContentPlacement,
): ViewportState {
  const unchanged =
    state.contentKey === key &&
    state.contentWidth === width &&
    state.contentHeight === height &&
    state.placement === placement
  if (unchanged && (state.fittedKey === key || width <= 0 || height <= 0 || state.viewWidth <= 0)) {
    return state
  }
  const next = {
    ...state,
    contentKey: key,
    contentWidth: width,
    contentHeight: height,
    placement,
  }
  if (state.fittedKey === key) return next
  return tryPlace(next)
}

function tryPlace(state: ViewportState): ViewportState {
  if (state.viewWidth <= 0 || state.viewHeight <= 0 || state.contentWidth <= 0 || state.contentHeight <= 0) {
    return state
  }
  const placed = state.placement === 'fit' ? placeFitted(state) : placeCentered(state)
  if (placed === state) return { ...state, fittedKey: state.contentKey }
  return { ...placed, fittedKey: state.contentKey }
}

function rememberPanel(state: ViewportState): void {
  saveNavigator({ x: state.panelX, y: state.panelY, custom: state.panelCustom })
}

function rememberTool(state: ViewportState): void {
  saveTools({ x: state.toolX, y: state.toolY, custom: state.toolCustom })
}

function hydratePlacement(): void {
  const saved = preferencesStore.get()
  if (!saved.navigator.custom && !saved.tools.custom) return
  viewportStore.setState((state) => ({
    ...state,
    panelX: saved.navigator.custom ? saved.navigator.x : state.panelX,
    panelY: saved.navigator.custom ? saved.navigator.y : state.panelY,
    panelCustom: saved.navigator.custom,
    toolX: saved.tools.custom ? saved.tools.x : state.toolX,
    toolY: saved.tools.custom ? saved.tools.y : state.toolY,
    toolCustom: saved.tools.custom,
  }))
}

hydratePlacement()

function dockedToolPosition(): { x: number; y: number } {
  return { x: PANEL_MARGIN, y: PANEL_MARGIN }
}

function clampTool(state: ViewportState): ViewportState {
  const docked = dockedToolPosition()
  const x = state.toolCustom ? state.toolX : docked.x
  const y = state.toolCustom ? state.toolY : docked.y
  const toolX = clamp(x, PANEL_MARGIN, Math.max(PANEL_MARGIN, state.viewWidth - state.toolWidth - PANEL_MARGIN))
  const toolY = clamp(y, PANEL_MARGIN, Math.max(PANEL_MARGIN, state.viewHeight - state.toolHeight - PANEL_MARGIN))
  if (toolX === state.toolX && toolY === state.toolY) return state
  return { ...state, toolX, toolY }
}

function dockedPanelPosition(state: ViewportState): { x: number; y: number } {
  return {
    x: Math.max(PANEL_MARGIN, state.viewWidth - state.panelWidth - PANEL_MARGIN),
    y: PANEL_MARGIN,
  }
}

function clampPanel(state: ViewportState): ViewportState {
  const docked = dockedPanelPosition(state)
  const x = state.panelCustom ? state.panelX : docked.x
  const y = state.panelCustom ? state.panelY : docked.y
  const panelX = clamp(x, PANEL_MARGIN, Math.max(PANEL_MARGIN, state.viewWidth - state.panelWidth - PANEL_MARGIN))
  const panelY = clamp(y, PANEL_MARGIN, Math.max(PANEL_MARGIN, state.viewHeight - state.panelHeight - PANEL_MARGIN))
  if (panelX === state.panelX && panelY === state.panelY) return state
  return { ...state, panelX, panelY }
}
