import { preferencesStore } from '../state/preferences.ts'
import { formatZoomPercent } from '../state/viewport.ts'
import type { AppLocale } from './locale.ts'
import { message, type MessageId } from './messages.ts'

export type { AppLocale }

const imageFormatNames = ['PNG', 'JPEG', 'GIF', 'WebP', 'AVIF', 'BMP', 'TIFF', 'SVG']

const listFormats = new Map<AppLocale, Intl.ListFormat>()
const numberFormats = new Map<AppLocale, Intl.NumberFormat>()
const percentFormats = new Map<AppLocale, Intl.NumberFormat>()

function activeLocale(): AppLocale {
  return preferencesStore.get().locale
}

function listFormat(locale: AppLocale): Intl.ListFormat {
  const cached = listFormats.get(locale)
  if (cached) return cached
  const created = new Intl.ListFormat(locale, { type: 'disjunction', style: 'long' })
  listFormats.set(locale, created)
  return created
}

function numberFormat(locale: AppLocale): Intl.NumberFormat {
  const cached = numberFormats.get(locale)
  if (cached) return cached
  const created = new Intl.NumberFormat(locale)
  numberFormats.set(locale, created)
  return created
}

function percentFormat(locale: AppLocale): Intl.NumberFormat {
  const cached = percentFormats.get(locale)
  if (cached) return cached
  const created = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 })
  percentFormats.set(locale, created)
  return created
}

export function imageFormats(): string {
  return listFormat(activeLocale()).format(imageFormatNames)
}

export function formatPixelSize(width: number, height: number): string {
  const format = numberFormat(activeLocale())
  return `${format.format(width)} × ${format.format(height)}`
}

export function formatPercent(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio))
  return percentFormat(activeLocale()).format(Math.round(clamped * 100) / 100)
}

export function formatScale(scale: number): string {
  return formatZoomPercent(scale)
}

export function t(id: MessageId, values?: Record<string, string>): string {
  const template = message(activeLocale(), id)
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

export function applyDocumentLocale(): void {
  document.documentElement.lang = activeLocale()
  const boot = document.querySelector('.boot')
  if (boot) boot.setAttribute('aria-label', t('loadingTopo'))
}
