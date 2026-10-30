import { Store } from '@tanstack/store'

export type ImageDocumentStatus = 'empty' | 'loading' | 'ready' | 'error'

export type ImageDocumentState = {
  status: ImageDocumentStatus
  fileName: string | null
  objectUrl: string | null
  message: string | null
}

export const IMAGE_FILE_ACCEPT =
  'image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.avif,.bmp,.svg'

const IMAGE_NAME = /\.(apng|avif|bmp|gif|jpe?g|png|svg|webp)$/i

const emptyDocument: ImageDocumentState = {
  status: 'empty',
  fileName: null,
  objectUrl: null,
  message: null,
}

export const imageDocumentStore = new Store<ImageDocumentState>(emptyDocument)

let requestId = 0
let activeUrl: string | null = null
let openPicker: () => void = () => {}

export function registerImageFilePicker(open: () => void): () => void {
  openPicker = open
  return () => {
    if (openPicker === open) openPicker = () => {}
  }
}

export function requestImageFilePicker(): void {
  openPicker()
}

export function openImageFile(file: File): void {
  const id = ++requestId

  if (!isLikelyImageFile(file)) {
    releaseActiveUrl()
    imageDocumentStore.setState(() => ({
      status: 'error',
      fileName: file.name,
      objectUrl: null,
      message: `"${file.name}" isn't a picture Topo can place. Choose a PNG, JPEG, GIF, WebP, AVIF, BMP, or SVG.`,
    }))
    return
  }

  releaseActiveUrl()
  const objectUrl = URL.createObjectURL(file)
  activeUrl = objectUrl
  imageDocumentStore.setState(() => ({
    status: 'loading',
    fileName: file.name,
    objectUrl,
    message: null,
  }))

  const probe = new Image()
  probe.onload = () => {
    if (id !== requestId) return
    imageDocumentStore.setState(() => ({
      status: 'ready',
      fileName: file.name,
      objectUrl,
      message: null,
    }))
  }
  probe.onerror = () => {
    if (id !== requestId) return
    if (activeUrl === objectUrl) {
      URL.revokeObjectURL(objectUrl)
      activeUrl = null
    }
    imageDocumentStore.setState(() => ({
      status: 'error',
      fileName: file.name,
      objectUrl: null,
      message: `Topo couldn't show "${file.name}". The file may be damaged, or this browser can't decode that format.`,
    }))
  }
  probe.src = objectUrl
}

function isLikelyImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_NAME.test(file.name)
}

function releaseActiveUrl(): void {
  if (!activeUrl) return
  URL.revokeObjectURL(activeUrl)
  activeUrl = null
}
