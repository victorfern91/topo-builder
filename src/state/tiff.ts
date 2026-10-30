import { type IFD } from 'utif2'

type TiffLib = {
  decode(buffer: ArrayBuffer): IFD[]
  decodeImage(buffer: ArrayBuffer, ifd: IFD): void
  toRGBA8(ifd: IFD): Uint8Array
}

const TIFF_NAME = /\.tiff?$/i

export function isTiffFile(file: File): boolean {
  return (
    file.type === 'image/tiff' ||
    file.type === 'image/tif' ||
    file.type === 'image/x-tiff' ||
    TIFF_NAME.test(file.name)
  )
}

export async function tiffToPngBlob(file: File): Promise<Blob> {
  const lib = await loadTiffLib()
  const buffer = await file.arrayBuffer()
  const pages = pagesToTry(lib.decode(buffer))
  for (const page of pages) {
    const blob = rasterizePage(lib, buffer, page)
    if (blob) return blob
  }
  throw new Error('Topo could not decode this TIFF.')
}

async function loadTiffLib(): Promise<TiffLib> {
  const loaded = await import('utif2')
  if (typeof loaded.decode === 'function') return loaded
  const fallback = (loaded as { default?: TiffLib }).default
  if (fallback && typeof fallback.decode === 'function') return fallback
  throw new Error('Topo could not decode this TIFF.')
}

function pagesToTry(pages: readonly IFD[]): IFD[] {
  const full = pages.filter((page) => !isReducedResolution(page))
  return full.length > 0 ? full : [...pages]
}

function isReducedResolution(ifd: IFD): boolean {
  const modern = tagNumber(ifd.t254)
  if (modern !== null && (modern & 1) === 1) return true
  return tagNumber(ifd.t255) === 2
}

function tagNumber(tag: IFD[string] | undefined): number | null {
  if (typeof tag === 'number') return tag
  if (Array.isArray(tag)) {
    const first = tag[0]
    return typeof first === 'number' ? first : null
  }
  return null
}

function rasterizePage(lib: TiffLib, buffer: ArrayBuffer, page: IFD): Blob | null {
  try {
    lib.decodeImage(buffer, page)
    const rgba = lib.toRGBA8(page)
    const { width, height } = page
    if (width < 1 || height < 1 || rgba.length !== width * height * 4) return null
    return rgbaToPngBlob(rgba, width, height)
  } catch {
    return null
  }
}

function rgbaToPngBlob(rgba: Uint8Array, width: number, height: number): Blob | null {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0)
  const encoded = canvas.toDataURL('image/png')
  const bytes = dataUrlToBytes(encoded)
  if (!bytes) return null
  return new Blob([bytes], { type: 'image/png' })
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const marker = dataUrl.indexOf(',')
  if (marker === -1) return null
  const binary = atob(dataUrl.slice(marker + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}
