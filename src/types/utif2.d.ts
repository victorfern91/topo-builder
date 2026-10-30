declare module 'utif2' {
  export interface IFD {
    [property: string]: string[] | number[] | number | Uint8Array | undefined
    data?: Uint8Array
    width: number
    height: number
  }

  export function decode(buffer: ArrayBuffer): IFD[]
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD): void
  export function toRGBA8(ifd: IFD): Uint8Array
}
