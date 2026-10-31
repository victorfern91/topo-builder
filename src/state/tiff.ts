import type { IFD } from "utif2";

type Decompress = (
  image: IFD,
  directories: IFD[] | undefined,
  data: Uint8Array,
  offset: number,
  length: number,
  compression: number,
  target: Uint8Array,
  targetOffset: number,
  fillOrder: number,
  width: number,
  height: number,
) => void;

type CopyTile = (
  tile: Uint8Array,
  tileStride: number,
  tileHeight: number,
  destination: Uint8Array,
  destinationStride: number,
  imageHeight: number,
  x: number,
  y: number,
) => void;

type TiffLib = {
  decode: ((buffer: ArrayBuffer) => IFD[]) & { _decompress?: Decompress };
  decodeImage(buffer: ArrayBuffer, ifd: IFD, directories?: IFD[]): void;
  toRGBA8(ifd: IFD): Uint8Array;
  _copyTile?: CopyTile;
};

const TIFF_NAME = /\.tiff?$/i;
const DECODE_ERROR = "Topo could not decode this TIFF.";

export function isTiffFile(file: File): boolean {
  return (
    file.type === "image/tiff" ||
    file.type === "image/tif" ||
    file.type === "image/x-tiff" ||
    TIFF_NAME.test(file.name)
  );
}

export async function tiffToPngBlob(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  let reported = -1;
  const report = (ratio: number) => {
    const next = Math.max(reported, Math.min(1, ratio));
    if (next === reported) return;
    reported = next;
    onProgress?.(next);
  };

  report(0);
  await nextFrame();
  await nextFrame();
  const lib = await loadTiffLib();
  report(0.03);
  const buffer = await readFileBytes(file, (ratio) =>
    report(0.03 + ratio * 0.15),
  );
  const pages = pagesToTry(lib.decode(buffer));
  if (pages.length === 0) throw new Error(DECODE_ERROR);

  for (const page of pages) {
    const blob = await rasterizePage(lib, buffer, page, (ratio) =>
      report(0.18 + ratio * 0.82),
    );
    if (blob) {
      report(1);
      return blob;
    }
  }
  throw new Error(DECODE_ERROR);
}

async function loadTiffLib(): Promise<TiffLib> {
  const loaded: unknown = await import("utif2");
  const lib =
    asTiffLib(loaded) ?? asTiffLib((loaded as { default?: unknown }).default);
  if (!lib) throw new Error(DECODE_ERROR);
  return lib;
}

function asTiffLib(loaded: unknown): TiffLib | null {
  if (!loaded || typeof loaded !== "object") return null;
  const candidate = loaded as TiffLib;
  if (typeof candidate.decode !== "function") return null;
  if (typeof candidate.decodeImage !== "function") return null;
  if (typeof candidate.toRGBA8 !== "function") return null;
  return candidate;
}

async function readFileBytes(
  file: File,
  onRatio: (ratio: number) => void,
): Promise<ArrayBuffer> {
  try {
    return await readFileStream(file, onRatio);
  } catch {
    const buffer = await file.arrayBuffer();
    onRatio(1);
    return buffer;
  }
}

async function readFileStream(
  file: File,
  onRatio: (ratio: number) => void,
): Promise<ArrayBuffer> {
  if (typeof file.stream !== "function" || file.size < 1) {
    const buffer = await file.arrayBuffer();
    onRatio(1);
    return buffer;
  }

  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onRatio(Math.min(1, received / file.size));
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onRatio(1);
  return merged.buffer;
}

function pagesToTry(pages: readonly IFD[]): IFD[] {
  const full = pages.filter((page) => !isReducedResolution(page));
  return full.length > 0 ? full : [...pages];
}

function isReducedResolution(ifd: IFD): boolean {
  const modern = tagNumber(ifd.t254);
  if (modern !== null && (modern & 1) === 1) return true;
  return tagNumber(ifd.t255) === 2;
}

function tagNumber(tag: IFD[string] | undefined): number | null {
  if (typeof tag === "number") return tag;
  if (Array.isArray(tag)) {
    const first = tag[0];
    return typeof first === "number" ? first : null;
  }
  return null;
}

function numberList(tag: IFD[string] | undefined): number[] | null {
  if (typeof tag === "number") return [tag];
  if (!Array.isArray(tag) || tag.length === 0) return null;
  const numbers: number[] = [];
  for (const item of tag) {
    if (typeof item !== "number") return null;
    numbers.push(item);
  }
  return numbers;
}

async function rasterizePage(
  lib: TiffLib,
  buffer: ArrayBuffer,
  page: IFD,
  onFraction: (ratio: number) => void,
): Promise<Blob | null> {
  try {
    await decodeImageGradually(lib, buffer, page, (ratio) =>
      onFraction(ratio * 0.64),
    );
    if (!page.data) return null;
    const rgba = await pageToRgba(lib, page, (ratio) =>
      onFraction(0.64 + ratio * 0.33),
    );
    const { width, height } = page;
    if (!rgba || width < 1 || height < 1 || rgba.length !== width * height * 4)
      return null;
    onFraction(0.97);
    await nextFrame();
    return await rgbaToPngBlob(rgba, width, height);
  } catch {
    return null;
  }
}

async function decodeImageGradually(
  lib: TiffLib,
  buffer: ArrayBuffer,
  page: IFD,
  onFraction: (ratio: number) => void,
): Promise<void> {
  if (page.data) {
    onFraction(1);
    return;
  }

  const decompress = lib.decode._decompress;
  const copyTile = lib._copyTile;
  if (typeof decompress !== "function" || typeof copyTile !== "function") {
    lib.decodeImage(buffer, page);
    onFraction(1);
    return;
  }

  const data = new Uint8Array(buffer);
  const width = tagNumber(page.t256);
  const height = tagNumber(page.t257);
  if (width === null || height === null || width < 1 || height < 1) return;

  const isLE = data[0] === 0x49 && data[1] === 0x49;
  (page as unknown as { isLE: boolean }).isLE = isLE;
  page.width = width;
  page.height = height;

  const compression = tagNumber(page.t259) ?? 1;
  const fillOrder = tagNumber(page.t266) ?? 1;
  const sampleBits = numberList(page.t258);
  if (compression === 7 && sampleBits && sampleBits.length > 3)
    page.t258 = sampleBits.slice(0, 3);

  const samples = tagNumber(page.t277) ?? 1;
  let bitsPerPixel = (tagNumber(page.t258) ?? 1) * samples;
  const photometric = tagNumber(page.t262);
  const stripRowsTag = tagNumber(page.t278);
  const firstByteCount = tagNumber(page.t279);
  if (
    compression === 1 &&
    firstByteCount !== null &&
    stripRowsTag !== null &&
    photometric === 32803
  ) {
    bitsPerPixel = Math.round((firstByteCount * 8) / (width * stripRowsTag));
  }
  if (tagNumber(page.t50885) === 4) {
    const bits = tagNumber(page.t258);
    if (bits !== null) bitsPerPixel = bits * 3;
  }

  const bitsPerLine = Math.ceil((width * bitsPerPixel) / 8) * 8;
  let offsets = numberList(page.t273);
  if (!offsets || page.t322 != null) offsets = numberList(page.t324);
  let counts = numberList(page.t279);
  if (compression === 1 && offsets?.length === 1)
    counts = [height * (bitsPerLine >>> 3)];
  if (!counts || page.t322 != null) counts = numberList(page.t325);
  if (!offsets || !counts) return;

  const directCopy = canCopyUncompressed(page, compression, isLE);
  let decoded = new Uint8Array(height * (bitsPerLine >>> 3));
  let bitLength = 0;
  let copied = 0;
  const totalBytes = offsets.reduce(
    (sum, _, index) => sum + (counts[index] ?? 0),
    0,
  );
  const clock = { at: performance.now() };
  const reportBytes = async (bytes: number) => {
    copied += bytes;
    onFraction(totalBytes > 0 ? Math.min(1, copied / totalBytes) : 1);
    await yieldToPaint(clock);
  };

  if (page.t322 != null) {
    const tileWidth = tagNumber(page.t322);
    const tileHeight = tagNumber(page.t323);
    if (tileWidth === null || tileHeight === null) return;
    const tilesX = Math.floor((width + tileWidth - 1) / tileWidth);
    const tilesY = Math.floor((height + tileHeight - 1) / tileHeight);
    const tileBuffer = new Uint8Array(
      Math.ceil((tileWidth * tileHeight * bitsPerPixel) / 8),
    );
    const tileStride = Math.ceil((tileWidth * bitsPerPixel) / 8);
    const rowStride = Math.ceil((width * bitsPerPixel) / 8);
    for (let y = 0; y < tilesY; y += 1) {
      for (let x = 0; x < tilesX; x += 1) {
        const index = y * tilesX + x;
        const offset = offsets[index];
        const byteCount = counts[index];
        if (offset === undefined || byteCount === undefined) return;
        tileBuffer.fill(0);
        if (directCopy && fits(data, offset, byteCount, tileBuffer, 0)) {
          await copyBytes(data, offset, byteCount, tileBuffer, 0, reportBytes);
        } else {
          decompress(
            page,
            undefined,
            data,
            offset,
            byteCount,
            compression,
            tileBuffer,
            0,
            fillOrder,
            tileWidth,
            tileHeight,
          );
          await reportBytes(byteCount);
        }
        if (compression === 6) decoded = tileBuffer;
        else
          copyTile(
            tileBuffer,
            tileStride,
            tileHeight,
            decoded,
            rowStride,
            height,
            Math.ceil((x * tileWidth * bitsPerPixel) / 8),
            y * tileHeight,
          );
      }
    }
    bitLength = decoded.length * 8;
  } else {
    const rowsPerStrip = Math.min(stripRowsTag ?? height, height);
    for (let index = 0; index < offsets.length; index += 1) {
      const offset = offsets[index];
      const byteCount = counts[index];
      if (offset === undefined || byteCount === undefined) return;
      const targetOffset = Math.ceil(bitLength / 8);
      if (directCopy && fits(data, offset, byteCount, decoded, targetOffset)) {
        await copyBytes(
          data,
          offset,
          byteCount,
          decoded,
          targetOffset,
          reportBytes,
        );
      } else {
        decompress(
          page,
          undefined,
          data,
          offset,
          byteCount,
          compression,
          decoded,
          targetOffset,
          fillOrder,
          width,
          rowsPerStrip,
        );
        await reportBytes(byteCount);
      }
      bitLength += bitsPerLine * rowsPerStrip;
    }
    bitLength = Math.min(bitLength, decoded.length * 8);
  }

  onFraction(1);
  page.data = new Uint8Array(decoded.buffer, 0, Math.ceil(bitLength / 8));
}

function canCopyUncompressed(
  page: IFD,
  compression: number,
  isLE: boolean,
): boolean {
  if (compression !== 1) return false;
  if (tagNumber(page.t317) === 2) return false;
  const bits = tagNumber(page.t258) ?? 1;
  return !(bits === 16 && !isLE && tagNumber(page.t33422) === null);
}

function fits(
  source: Uint8Array,
  sourceOffset: number,
  length: number,
  target: Uint8Array,
  targetOffset: number,
): boolean {
  return (
    sourceOffset >= 0 &&
    length >= 0 &&
    sourceOffset + length <= source.length &&
    targetOffset >= 0 &&
    targetOffset + length <= target.length
  );
}

async function copyBytes(
  source: Uint8Array,
  sourceOffset: number,
  length: number,
  target: Uint8Array,
  targetOffset: number,
  onCopied: (bytes: number) => Promise<void>,
): Promise<void> {
  const chunk = 256 * 1024;
  for (let cursor = 0; cursor < length; cursor += chunk) {
    const size = Math.min(chunk, length - cursor);
    target.set(
      source.subarray(sourceOffset + cursor, sourceOffset + cursor + size),
      targetOffset + cursor,
    );
    await onCopied(size);
  }
}

async function pageToRgba(
  lib: TiffLib,
  page: IFD,
  onFraction: (ratio: number) => void,
): Promise<Uint8Array | null> {
  const source = page.data;
  const { width, height } = page;
  if (!source || width < 1 || height < 1) return null;
  if (!canConvertInBands(page)) {
    const rgba = convertWholePage(lib, page);
    onFraction(1);
    return rgba;
  }

  const stride = rowStride(page);
  if (stride === null) return convertWholePage(lib, page);
  const rowsPerBand = Math.max(
    1,
    Math.min(height, Math.floor(500_000 / width)),
  );
  const rgba = new Uint8Array(width * height * 4);
  const clock = { at: performance.now() };
  const restorePage = () => {
    page.height = height;
    page.data = source;
  };

  try {
    for (let y = 0; y < height; y += rowsPerBand) {
      const rows = Math.min(rowsPerBand, height - y);
      const isolated = new Uint8Array(stride * rows);
      isolated.set(source.subarray(y * stride, y * stride + stride * rows));
      page.height = rows;
      page.data = isolated;
      let piece: Uint8Array;
      try {
        piece = lib.toRGBA8(page);
      } catch {
        restorePage();
        return convertWholePage(lib, page);
      }
      if (piece.length !== width * rows * 4) {
        restorePage();
        return convertWholePage(lib, page);
      }
      rgba.set(piece, y * width * 4);
      onFraction((y + rows) / height);
      await yieldToPaint(clock);
    }
  } finally {
    restorePage();
  }

  return rgba;
}

function canConvertInBands(page: IFD): boolean {
  if (!page.data || page.width < 1 || page.height < 1) return false;
  if (tagNumber(page.t284) === 2) return false;
  if (tagNumber(page.t50885) != null) return false;
  const sampleFormat = tagNumber(page.t339);
  if (sampleFormat !== null && sampleFormat !== 1) return false;

  const bits = tagNumber(page.t258) ?? 1;
  const photometric = tagNumber(page.t262) ?? (bits === 1 ? 0 : 2);
  if (photometric === 6 || photometric === 32803 || photometric === 32845)
    return false;

  const stride = rowStride(page);
  if (stride === null || page.data.length < stride * page.height) return false;
  if (bits === 8) return true;
  if (
    (bits === 1 || bits === 2 || bits === 4) &&
    (photometric === 0 || photometric === 1 || photometric === 3)
  ) {
    return true;
  }
  return (
    bits === 16 && (photometric === 0 || photometric === 1 || photometric === 2)
  );
}

function rowStride(page: IFD): number | null {
  if (page.width < 1) return null;
  const bitsTag = numberList(page.t258);
  const bits = bitsTag ? Math.min(32, bitsTag[0] ?? 1) : 1;
  let photometric = tagNumber(page.t262);
  if (photometric === null && bits === 1) photometric = 0;
  if (photometric === null) photometric = 2;
  const samples =
    tagNumber(page.t277) ??
    bitsTag?.length ??
    [1, 1, 3, 1, 1, 4, 3][photometric] ??
    1;
  return Math.ceil((samples * bits * page.width) / 8);
}

function convertWholePage(lib: TiffLib, page: IFD): Uint8Array | null {
  try {
    const rgba = lib.toRGBA8(page);
    if (rgba.length !== page.width * page.height * 4) return null;
    return rgba;
  } catch {
    return null;
  }
}

async function rgbaToPngBlob(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.putImageData(
    new ImageData(new Uint8ClampedArray(rgba), width, height),
    0,
    0,
  );
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (blob) return blob;
  const encoded = canvas.toDataURL("image/png");
  const bytes = dataUrlToBytes(encoded);
  if (!bytes) return null;
  return new Blob([bytes], { type: "image/png" });
}

function dataUrlToBytes(dataUrl: string): ArrayBuffer | null {
  const marker = dataUrl.indexOf(",");
  if (marker === -1) return null;
  const binary = atob(dataUrl.slice(marker + 1));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function yieldToPaint(clock: { at: number }): Promise<void> {
  const now = performance.now();
  if (now - clock.at < 48) return;
  await nextFrame();
  clock.at = performance.now();
}
