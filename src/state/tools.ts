import { Store } from '@tanstack/store'
import { ZOOM_STEP, type ViewportActions, type ZoomOrigin } from './viewport.ts'

export type ToolGroupId = 'move' | 'zoom'

export const ZOOM_TOOLS = ['zoom-in', 'zoom-out'] as const

export type ZoomToolId = (typeof ZOOM_TOOLS)[number]

export const ZOOM_COMMANDS = ['fit', 'actual-size'] as const

export type ZoomCommandId = (typeof ZOOM_COMMANDS)[number]

export type ToolId = 'pan' | ZoomToolId | ZoomCommandId

export type ToolCursor = 'default' | 'grab' | 'zoom-in' | 'zoom-out'

export type ToolState = {
  group: ToolGroupId
  zoom: ZoomToolId
}

const DRAG_ZOOM = 0.01

export const toolStore = new Store<ToolState>({ group: 'move', zoom: 'zoom-in' })

export function activeTool(state: ToolState): ToolId {
  return state.group === 'move' ? 'pan' : state.zoom
}

export function selectGroup(group: ToolGroupId): void {
  toolStore.setState((state) => (state.group === group ? state : { ...state, group }))
}

export function selectZoom(zoom: ZoomToolId): void {
  toolStore.setState((state) =>
    state.group === 'zoom' && state.zoom === zoom ? state : { group: 'zoom', zoom },
  )
}

export function toolCursor(id: ToolId): ToolCursor {
  if (id === 'pan') return 'grab'
  if (id === 'zoom-in') return 'zoom-in'
  if (id === 'zoom-out') return 'zoom-out'
  return 'default'
}

export function toolUsesMove(id: ToolId): boolean {
  return id === 'pan' || id === 'zoom-in' || id === 'zoom-out'
}

export function applyToolClick(id: ToolId, actions: ViewportActions, origin: ZoomOrigin): void {
  if (id === 'zoom-in') actions.zoomBy(ZOOM_STEP, origin)
  else if (id === 'zoom-out') actions.zoomBy(1 / ZOOM_STEP, origin)
  else if (id === 'fit') actions.fit()
  else if (id === 'actual-size') actions.actualSize()
}

export function applyToolMove(
  id: ToolId,
  actions: ViewportActions,
  dx: number,
  dy: number,
  origin: ZoomOrigin,
): void {
  if (id === 'pan') {
    actions.panBy(dx, dy)
    return
  }
  if (id !== 'zoom-in' && id !== 'zoom-out') return
  const factor = Math.exp(-dy * DRAG_ZOOM)
  if (factor === 1) return
  actions.zoomBy(factor, origin)
}
