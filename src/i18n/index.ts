import { readNavigatorLanguages, resolveLocale, type AppLocale } from './locale.ts'
import { message, type MessageId } from './messages.ts'

export type { AppLocale }

export const locale: AppLocale = resolveLocale(readNavigatorLanguages())

const imageFormatNames = ['PNG', 'JPEG', 'GIF', 'WebP', 'AVIF', 'BMP', 'TIFF', 'SVG']

export function imageFormats(): string {
  return new Intl.ListFormat(locale, {
    type: 'disjunction',
    style: 'long',
  }).format(imageFormatNames)
}

export function t(id: MessageId, values?: Record<string, string>): string {
  const template = message(locale, id)
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

export function applyDocumentLocale(): void {
  document.documentElement.lang = locale
  const boot = document.querySelector('.boot')
  if (boot) boot.setAttribute('aria-label', t('loadingTopo'))
}
