import { Store } from '@tanstack/store'

export type ImageProblem = 'not-a-picture' | 'cannot-decode'

export type ImageDocumentState =
  | {
      status: 'empty'
      fileName: null
      objectUrl: null
      problem: null
    }
  | {
      status: 'loading'
      fileName: string
      objectUrl: string
      problem: null
    }
  | {
      status: 'ready'
      fileName: string
      objectUrl: string
      problem: null
    }
  | {
      status: 'error'
      fileName: string
      objectUrl: null
      problem: ImageProblem
    }

export const IMAGE_FILE_ACCEPT =
  'image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.avif,.bmp,.svg'

const IMAGE_NAME = /\.(apng|avif|bmp|gif|jpe?g|png|svg|webp)$/i

const emptyDocument: ImageDocumentState = {
  status: 'empty',
  fileName: null,
  objectUrl: null,
  problem: null,
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
      problem: 'not-a-picture',
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
    problem: null,
  }))

  const probe = new Image()
  probe.onload = () => {
    if (id !== requestId) return
    imageDocumentStore.setState(() => ({
      status: 'ready',
      fileName: file.name,
      objectUrl,
      problem: null,
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
      problem: 'cannot-decode',
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
