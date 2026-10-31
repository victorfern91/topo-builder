export const POINT_MARKS = ['bolt', 'ring', 'belay', 'rappel'] as const

export type PointMark = (typeof POINT_MARKS)[number]

/** Image-pixel disc radius at draw scale 1. Ticks sit just outside it. */
export const MARK_RADIUS = 12

const TICKS = 6

export function markRadius(scale: number): number {
  return MARK_RADIUS * Math.max(scale, 0)
}

/** How far a plain anchor snaps onto a mark, in image pixels. */
export function magnetReach(zoom: number, scale: number): number {
  const visual = markRadius(scale) * 0.85
  if (!(zoom > 0)) return visual
  return Math.max(16 / zoom, visual)
}

/** White hardware symbol. Holes and the arrow are black, matching the reference art. */
export function drawPointMark(
  ctx: CanvasRenderingContext2D,
  mark: PointMark,
  radius: number,
  hairline: number,
): void {
  if (!(radius > 0)) return
  fillDisc(ctx, radius, hairline, mark === 'bolt' || mark === 'ring')
  if (mark === 'ring') fillHole(ctx, 0, 0, radius * 0.36)
  else if (mark === 'belay') {
    const hole = radius * 0.32
    const offset = radius * 0.5
    fillHole(ctx, -offset, 0, hole)
    fillHole(ctx, offset, 0, hole)
  } else if (mark === 'rappel') drawArrow(ctx, radius)
}

function fillDisc(ctx: CanvasRenderingContext2D, radius: number, hairline: number, ticks: boolean): void {
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  if (ticks) addTicks(ctx, radius)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = hairline
  ctx.lineJoin = 'round'
  ctx.lineCap = 'butt'
  ctx.strokeStyle = '#111111'
  ctx.stroke()
}

function addTicks(ctx: CanvasRenderingContext2D, radius: number): void {
  const width = radius * 0.16
  const length = radius * 0.2
  const inner = radius - length * 0.35
  for (let index = 0; index < TICKS; index += 1) {
    const angle = Math.PI / 4 + index * (Math.PI / 3)
    ctx.save()
    ctx.rotate(angle)
    ctx.rect(-width / 2, -inner - length, width, length)
    ctx.restore()
  }
}

function fillHole(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#111111'
  ctx.fill()
}

function drawArrow(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = radius * 0.14
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -radius * 0.55)
  ctx.lineTo(0, radius * 0.28)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-radius * 0.42, radius * 0.05)
  ctx.lineTo(0, radius * 0.58)
  ctx.lineTo(radius * 0.42, radius * 0.05)
  ctx.stroke()
}
