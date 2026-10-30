import type { AppLocale } from './locale.ts'

const enUS = {
  file: 'File',
  openEllipsis: 'Open…',
  open: 'Open',
  noDocument: 'No document',
  chooseImage: 'Choose an image',
  appTitle: 'Topo',
  documentTitle: '{fileName} — Topo',
  opening: 'Opening {fileName}',
  cannotShowFile: 'Can’t show this file',
  chooseAnotherFile: 'Choose another file',
  openedImage: 'Opened image',
  noImageTitle: 'No image on the artboard',
  emptyArtboard:
    'Open a {formats}. Topo places it on the board, scaled down if it is larger than the workspace.',
  openImage: 'Open image',
  loadingArtboard: 'Loading the artboard',
  loadingTopo: 'Loading Topo',
  notAPicture: '"{fileName}" isn’t a picture Topo can place. Choose a {formats}.',
  cannotDecode:
    'Topo couldn’t show "{fileName}". The file may be damaged, or this browser can’t decode that format.',
} as const

const ptPT = {
  file: 'Ficheiro',
  openEllipsis: 'Abrir…',
  open: 'Abrir',
  noDocument: 'Sem documento',
  chooseImage: 'Escolher uma imagem',
  appTitle: 'Topo',
  documentTitle: '{fileName} — Topo',
  opening: 'A abrir {fileName}',
  cannotShowFile: 'Não é possível mostrar este ficheiro',
  chooseAnotherFile: 'Escolher outro ficheiro',
  openedImage: 'Imagem aberta',
  noImageTitle: 'Nenhuma imagem na prancheta',
  emptyArtboard:
    'Abra um {formats}. O Topo coloca-o na prancheta e reduz a escala se for maior do que a área de trabalho.',
  openImage: 'Abrir imagem',
  loadingArtboard: 'A carregar a prancheta',
  loadingTopo: 'A carregar o Topo',
  notAPicture:
    '"{fileName}" não é uma imagem que o Topo consiga colocar. Escolha um {formats}.',
  cannotDecode:
    'O Topo não conseguiu mostrar "{fileName}". O ficheiro pode estar danificado, ou este navegador não consegue descodificar esse formato.',
} as const satisfies Record<keyof typeof enUS, string>

const catalogs = {
  'en-US': enUS,
  'pt-PT': ptPT,
} as const satisfies Record<AppLocale, Record<keyof typeof enUS, string>>

export type MessageId = keyof typeof enUS

export function message(locale: AppLocale, id: MessageId): string {
  return catalogs[locale][id]
}
