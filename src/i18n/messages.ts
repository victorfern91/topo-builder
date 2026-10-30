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
  converting: 'Converting {fileName}',
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
  artboard: 'Artboard',
  navigator: 'Navigator',
  dragNavigator: 'Drag to move the navigator',
  minimap: 'Mini map',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fitWindow: 'Fit on screen',
  fitShort: 'Fit',
  actualSize: 'Actual pixels',
  zoomPercent: 'Zoom',
  spaceKey: 'Space',
  navigatorHelp:
    'Drag the title bar to move this panel. Drop it at the top-right to dock it. Drag in the mini map to pan, or click to recenter. Scroll to pan. Hold Ctrl, Command, or Alt and scroll to zoom toward the pointer. Hold {pan} and drag to pan. {zoomIn} zooms in and {zoomOut} zooms out.',
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
  converting: 'A converter {fileName}',
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
  artboard: 'Prancheta',
  navigator: 'Navegador',
  dragNavigator: 'Arrastar para mover o navegador',
  minimap: 'Mini mapa',
  zoomIn: 'Ampliar',
  zoomOut: 'Reduzir',
  fitWindow: 'Ajustar ao ecrã',
  fitShort: 'Ajustar',
  actualSize: 'Pixéis reais',
  zoomPercent: 'Ampliação',
  spaceKey: 'Espaço',
  navigatorHelp:
    'Arraste a barra de título para mover este painel. Largue-o no canto superior direito para o ancorar. Arraste no mini mapa para deslocar a vista, ou clique para recentrar. Role para deslocar. Mantenha Ctrl, Command ou Alt e role para ampliar em direção ao ponteiro. Mantenha {pan} premido e arraste para deslocar. {zoomIn} amplia e {zoomOut} reduz.',
} as const satisfies Record<keyof typeof enUS, string>

const catalogs = {
  'en-US': enUS,
  'pt-PT': ptPT,
} as const satisfies Record<AppLocale, Record<keyof typeof enUS, string>>

export type MessageId = keyof typeof enUS

export function message(locale: AppLocale, id: MessageId): string {
  return catalogs[locale][id]
}
