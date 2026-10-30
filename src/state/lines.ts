import { Store } from '@tanstack/store'
import { t } from '../i18n/index.ts'
import { closestOnLine, curveDistance2, lineGeometry } from './line-curve.ts'
import type { CreateToolId } from './tools.ts'
import { MAX_ZOOM, MIN_ZOOM, sliderToZoom, zoomToSlider } from './viewport.ts'

export type LineKind = CreateToolId

export type Anchor = {
  x: number
  y: number
}

/** Same bounds as the zoom slider, so a given percent sits in the same place on both. */
export const DRAW_SCALE_MIN = MIN_ZOOM
export const DRAW_SCALE_MAX = MAX_ZOOM
export const DEFAULT_DRAW_SCALE = 1

/** Image-pixel stroke at scale 1. Paint and hit testing multiply by each line's scale. */
export const LINE_STROKE = 3

export function clampDrawScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DRAW_SCALE
  return Math.min(DRAW_SCALE_MAX, Math.max(DRAW_SCALE_MIN, value))
}

/** 0 at the minimum zoom and 1 at the maximum, on the zoom slider's log curve. */
export function drawScaleRatio(scale: number): number {
  return zoomToSlider(clampDrawScale(scale)) / 1000
}

export function drawScaleFromRatio(ratio: number): number {
  const t = Math.min(1, Math.max(0, ratio))
  return sliderToZoom(t * 1000)
}

export type LineLayer = {
  id: string
  name: string
  kind: LineKind
  color: string
  anchors: Anchor[]
  /** Stroke size relative to the photo. Stays on the line after it is created. */
  scale: number
  /** Bumps when anchors change so the canvas can reuse an unchanged Path2D. */
  geometryRevision: number
}

export type LineHit = { type: 'anchor'; layerId: string; index: number } | { type: 'stroke'; layerId: string }

export type LineState = {
  layers: LineLayer[]
  activeId: string | null
  /** Anchor chosen on the active line. Delete and the point menu use it. */
  anchorIndex: number | null
  hover: LineHit | null
  /** Scale the top bar writes onto every line, and that new lines copy. */
  scale: number
  revision: number
}

export const LINE_COLORS = ['#ff4d4d', '#ffb020', '#3ddc97', '#4c9aff', '#c084fc', '#ff7ab2', '#2ee6d6', '#f2f2f2'] as const

export type LineColor = (typeof LINE_COLORS)[number]

const HIT_PX = 8

let sequence = 0

export const lineStore = new Store<LineState>({
  layers: [],
  activeId: null,
  anchorIndex: null,
  hover: null,
  scale: DEFAULT_DRAW_SCALE,
  revision: 0,
})

export function beginLine(kind: LineKind): string {
  const layer = createLayer(kind, lineStore.get().layers)
  lineStore.setState((current) => ({
    ...current,
    layers: [...current.layers, layer],
    activeId: layer.id,
    anchorIndex: null,
    revision: current.revision + 1,
  }))
  return layer.id
}

export function ensureLine(kind: LineKind): string {
  const state = lineStore.get()
  if (state.activeId && findLayer(state, state.activeId)) return state.activeId
  return beginLine(kind)
}

/** Keeps the geometry and clears the selection. */
export function finishLine(): void {
  lineStore.setState((state) => {
    if (state.activeId === null && state.hover === null && state.anchorIndex === null) return state
    return { ...state, activeId: null, hover: null, anchorIndex: null }
  })
}

export function selectLine(id: string): void {
  lineStore.setState((state) => {
    if (!findLayer(state, id)) return state
    if (state.activeId === id && state.anchorIndex === null) return state
    return { ...state, activeId: id, anchorIndex: null }
  })
}

export function selectAnchor(layerId: string, index: number): void {
  lineStore.setState((state) => {
    const layer = findLayer(state, layerId)
    if (!layer || !layer.anchors[index]) return state
    if (state.activeId === layerId && state.anchorIndex === index) return state
    return { ...state, activeId: layerId, anchorIndex: index }
  })
}

export function setLineColor(id: string, color: LineColor): void {
  lineStore.setState((state) => {
    const index = state.layers.findIndex((layer) => layer.id === id)
    const current = state.layers[index]
    if (!current || current.color === color) return state
    const layers = state.layers.slice()
    layers[index] = { ...current, color }
    return { ...state, layers, revision: state.revision + 1 }
  })
}

export function renameLine(id: string, name: string): void {
  lineStore.setState((state) => {
    const index = state.layers.findIndex((layer) => layer.id === id)
    const current = state.layers[index]
    if (!current || current.name === name) return state
    const layers = state.layers.slice()
    layers[index] = { ...current, name }
    return { ...state, layers, revision: state.revision + 1 }
  })
}

/** Sets the drawing scale and writes it onto every line so they stay the same size on the photo. */
export function setDrawScale(scale: number): void {
  const next = clampDrawScale(scale)
  lineStore.setState((state) => {
    if (state.scale === next && state.layers.every((layer) => layer.scale === next)) return state
    return {
      ...state,
      scale: next,
      layers: state.layers.map((layer) => (layer.scale === next ? layer : { ...layer, scale })),
      revision: state.revision + 1,
    }
  })
}

export function clearLines(): void {
  lineStore.setState((state) => {
    if (state.layers.length === 0 && state.activeId === null && state.hover === null && state.anchorIndex === null) {
      return state
    }
    return {
      layers: [],
      activeId: null,
      anchorIndex: null,
      hover: null,
      scale: state.scale,
      revision: state.revision + 1,
    }
  })
}

export function setLineHover(hover: LineHit | null): void {
  lineStore.setState((state) => (sameHit(state.hover, hover) ? state : { ...state, hover }))
}

/** Appends a corner. Mutates the layer list in place so the table does not re-render. */
export function appendAnchor(layerId: string, x: number, y: number): number {
  const layer = findLayer(lineStore.get(), layerId)
  if (!layer) return -1
  layer.anchors.push({ x, y })
  touch(layer)
  return layer.anchors.length - 1
}

export function moveAnchor(layerId: string, index: number, startX: number, startY: number, dx: number, dy: number): void {
  const anchor = findAnchor(layerId, index)
  if (!anchor) return
  anchor.x = startX + dx
  anchor.y = startY + dy
  touch(layerOf(layerId))
}

export function pointOnLine(layerId: string, x: number, y: number): { index: number; x: number; y: number } | null {
  const layer = findLayer(lineStore.get(), layerId)
  if (!layer || layer.anchors.length < 2) return null
  return closestOnLine(lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops, x, y)
}

export function insertAnchor(layerId: string, index: number, x: number, y: number): void {
  const layer = findLayer(lineStore.get(), layerId)
  if (!layer) return
  const at = Math.max(0, Math.min(index, layer.anchors.length))
  layer.anchors.splice(at, 0, { x, y })
  layer.geometryRevision += 1
  lineStore.setState((state) => ({
    ...state,
    activeId: layerId,
    anchorIndex: at,
    hover: bumpHover(state.hover, layerId, at),
    revision: state.revision + 1,
  }))
}

export function deleteAnchor(layerId: string, index: number): void {
  const layer = findLayer(lineStore.get(), layerId)
  if (!layer || index < 0 || index >= layer.anchors.length) return
  layer.anchors.splice(index, 1)
  layer.geometryRevision += 1
  lineStore.setState((state) => ({
    ...state,
    anchorIndex: state.activeId === layerId ? shiftIndex(state.anchorIndex, index) : state.anchorIndex,
    hover: shiftHover(state.hover, layerId, index),
    revision: state.revision + 1,
  }))
}

export function deleteLastAnchor(): void {
  const layer = findLayer(lineStore.get(), lineStore.get().activeId)
  if (!layer || layer.anchors.length === 0) return
  deleteAnchor(layer.id, layer.anchors.length - 1)
}

export function hitTest(state: LineState, x: number, y: number, zoom: number): LineHit | null {
  if (zoom <= 0 || state.layers.length === 0) return null
  const tol = HIT_PX / zoom
  return nearestPoint(state, x, y, tol * tol) ?? nearestStroke(state, x, y, zoom)
}

export function findLayer(state: LineState, id: string | null): LineLayer | null {
  if (!id) return null
  return state.layers.find((layer) => layer.id === id) ?? null
}

function createLayer(kind: LineKind, layers: readonly LineLayer[]): LineLayer {
  sequence += 1
  const count = layers.reduce((total, layer) => total + (layer.kind === kind ? 1 : 0), 0) + 1
  return {
    id: `line-${sequence}`,
    name: t(kind === 'route' ? 'routeName' : 'boulderName', { n: String(count) }),
    kind,
    color: LINE_COLORS[layers.length % LINE_COLORS.length] ?? LINE_COLORS[0],
    anchors: [],
    scale: lineStore.get().scale,
    geometryRevision: 0,
  }
}

function touch(layer: LineLayer | null): void {
  if (!layer) return
  layer.geometryRevision += 1
  lineStore.setState((state) => ({ ...state, revision: state.revision + 1 }))
}

function layerOf(id: string): LineLayer | null {
  return findLayer(lineStore.get(), id)
}

function findAnchor(layerId: string, index: number): Anchor | null {
  return layerOf(layerId)?.anchors[index] ?? null
}

function nearestPoint(state: LineState, x: number, y: number, tol2: number): LineHit | null {
  let best: LineHit | null = null
  let bestDist = tol2
  for (let layerIndex = state.layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
    const layer = state.layers[layerIndex]
    if (!layer) continue
    for (let index = layer.anchors.length - 1; index >= 0; index -= 1) {
      const anchor = layer.anchors[index]
      if (!anchor) continue
      const dist = distance2(anchor.x, anchor.y, x, y)
      if (dist <= tol2 && (best === null || dist < bestDist)) {
        best = { type: 'anchor', layerId: layer.id, index }
        bestDist = dist
      }
    }
  }
  return best
}

function nearestStroke(state: LineState, x: number, y: number, zoom: number): LineHit | null {
  let bestId: string | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (let layerIndex = state.layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
    const layer = state.layers[layerIndex]
    if (!layer || layer.anchors.length < 2) continue
    const tol = HIT_PX / zoom + (LINE_STROKE * layer.scale) / 2
    const dist = strokeDistance2(layer, x, y)
    if (dist <= tol * tol && dist < bestDist) {
      bestDist = dist
      bestId = layer.id
    }
  }
  return bestId ? { type: 'stroke', layerId: bestId } : null
}

function strokeDistance2(layer: LineLayer, x: number, y: number): number {
  return curveDistance2(lineGeometry(layer.id, layer.geometryRevision, layer.anchors).ops, x, y)
}

function shiftIndex(current: number | null, deleted: number): number | null {
  if (current === null) return null
  if (current === deleted) return null
  if (current > deleted) return current - 1
  return current
}

function bumpHover(hover: LineHit | null, layerId: string, inserted: number): LineHit | null {
  if (!hover || hover.layerId !== layerId || hover.type !== 'anchor') return hover
  if (hover.index >= inserted) return { ...hover, index: hover.index + 1 }
  return hover
}

function shiftHover(hover: LineHit | null, layerId: string, deleted: number): LineHit | null {
  if (!hover || hover.layerId !== layerId || hover.type !== 'anchor') return hover
  if (hover.index === deleted) return null
  if (hover.index > deleted) return { ...hover, index: hover.index - 1 }
  return hover
}

function distance2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function sameHit(a: LineHit | null, b: LineHit | null): boolean {
  if (a === b) return true
  if (!a || !b || a.type !== b.type || a.layerId !== b.layerId) return false
  if (a.type === 'stroke' || b.type === 'stroke') return a.type === 'stroke' && b.type === 'stroke'
  return a.type === 'anchor' && b.type === 'anchor' && a.index === b.index
}
