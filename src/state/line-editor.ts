import type { CreateToolId } from './tools.ts'
import {
  appendAnchor,
  ensureLine,
  findLayer,
  hitTest,
  lineStore,
  moveAnchor,
  selectAnchor,
  selectLine,
  setLineHover,
} from './lines.ts'

type Gesture = {
  layerId: string
  index: number
  originX: number
  originY: number
  startX: number
  startY: number
}

let gesture: Gesture | null = null

export function lineGestureActive(): boolean {
  return gesture !== null
}

export function viewToContent(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  const safeZoom = zoom === 0 ? 1 : zoom
  return {
    x: (clientX - rect.left - panX) / safeZoom,
    y: (clientY - rect.top - panY) / safeZoom,
  }
}

/** Owns the pointer when edit mode grabs a point or line, or when the create tool places a new point. */
export function pointerDownLine(x: number, y: number, zoom: number, kind: CreateToolId | 'edit' | null): boolean {
  if (!kind) return false
  if (kind === 'edit') return beginEdit(x, y, zoom)
  const layerId = ensureLine(kind)
  const index = appendAnchor(layerId, x, y)
  if (index < 0) return false
  gesture = { layerId, index, originX: x, originY: y, startX: x, startY: y }
  return true
}

export function pointerMoveLine(x: number, y: number, zoom: number): void {
  if (!gesture) {
    setLineHover(hitTest(lineStore.get(), x, y, zoom))
    return
  }
  moveAnchor(gesture.layerId, gesture.index, gesture.startX, gesture.startY, x - gesture.originX, y - gesture.originY)
}

export function pointerUpLine(): void {
  gesture = null
}

function beginEdit(x: number, y: number, zoom: number): boolean {
  const hit = hitTest(lineStore.get(), x, y, zoom)
  if (hit?.type === 'anchor') {
    selectAnchor(hit.layerId, hit.index)
    const anchor = findLayer(lineStore.get(), hit.layerId)?.anchors[hit.index]
    if (!anchor) return false
    gesture = {
      layerId: hit.layerId,
      index: hit.index,
      originX: x,
      originY: y,
      startX: anchor.x,
      startY: anchor.y,
    }
    return true
  }
  if (hit?.type === 'stroke') {
    selectLine(hit.layerId)
    gesture = null
    return true
  }
  return false
}

export function hoverLine(x: number, y: number, zoom: number): void {
  if (gesture) return
  setLineHover(hitTest(lineStore.get(), x, y, zoom))
}

export function clearLineHover(): void {
  if (gesture) return
  setLineHover(null)
}
