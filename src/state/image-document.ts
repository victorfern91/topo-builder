import { Store } from "@tanstack/store";
import { errorCode, type ErrorCode } from "./errors.ts";
import { clearLines } from "./lines.ts";
import { isTiffFile, tiffToPngBlob } from "./tiff.ts";

export type PixelSize = {
  width: number;
  height: number;
};

export type ImageDocumentState =
  | {
      status: "empty";
      fileName: null;
      objectUrl: null;
      problem: null;
      size: null;
    }
  | {
      status: "loading";
      fileName: string;
      objectUrl: string | null;
      problem: null;
      size: null;
      progress: number | null;
    }
  | {
      status: "ready";
      fileName: string;
      objectUrl: string;
      problem: null;
      size: PixelSize | null;
    }
  | {
      status: "error";
      fileName: string;
      objectUrl: null;
      problem: ErrorCode;
      size: null;
    };

export const IMAGE_FILE_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/tiff,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.avif,.bmp,.tif,.tiff,.svg,.topo";

const IMAGE_NAME = /\.(apng|avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i;

const emptyDocument: ImageDocumentState = {
  status: "empty",
  fileName: null,
  objectUrl: null,
  problem: null,
  size: null,
};

export const imageDocumentStore = new Store<ImageDocumentState>(emptyDocument);

let requestId = 0;
let activeUrl: string | null = null;
let openPicker: () => void = () => {};

export function registerImageFilePicker(open: () => void): () => void {
  openPicker = open;
  return () => {
    if (openPicker === open) openPicker = () => {};
  };
}

export function requestImageFilePicker(): void {
  openPicker();
}

/** Drops the current drawing. `onReady` runs once this photo is on the board, unless another file was opened first. */
export function openImageFile(file: File, onReady?: () => void): void {
  const id = ++requestId;
  clearLines();

  if (!isLikelyImageFile(file)) {
    releaseActiveUrl();
    imageDocumentStore.setState(() => ({
      status: "error",
      fileName: file.name,
      objectUrl: null,
      problem: "IMAGE_NOT_SUPPORTED",
      size: null,
    }));
    return;
  }

  if (isTiffFile(file)) {
    releaseActiveUrl();
    imageDocumentStore.setState(() => ({
      status: "loading",
      fileName: file.name,
      objectUrl: null,
      problem: null,
      size: null,
      progress: 0,
    }));
    void placeTiff(file, id, onReady);
    return;
  }

  releaseActiveUrl();
  const objectUrl = URL.createObjectURL(file);
  activeUrl = objectUrl;
  imageDocumentStore.setState(() => ({
    status: "loading",
    fileName: file.name,
    objectUrl,
    problem: null,
    size: null,
    progress: null,
  }));

  void finishWhenDecoded(file.name, objectUrl, id, onReady);
}

/** Shows `problem` for a file that never reached the photo decoder. */
export function failImageFile(fileName: string, problem: ErrorCode): void {
  requestId += 1;
  clearLines();
  releaseActiveUrl();
  imageDocumentStore.setState(() => ({
    status: "error",
    fileName,
    objectUrl: null,
    problem,
    size: null,
  }));
}

async function placeTiff(
  file: File,
  id: number,
  onReady?: () => void,
): Promise<void> {
  const report = publishTiffProgress(id, file.name);
  try {
    const blob = await tiffToPngBlob(file, report);
    if (id !== requestId) return;
    const objectUrl = URL.createObjectURL(blob);
    if (id !== requestId) {
      URL.revokeObjectURL(objectUrl);
      return;
    }
    releaseActiveUrl();
    activeUrl = objectUrl;
    await finishWhenDecoded(file.name, objectUrl, id, onReady);
  } catch (error) {
    if (id !== requestId) return;
    releaseActiveUrl();
    imageDocumentStore.setState(() => ({
      status: "error",
      fileName: file.name,
      objectUrl: null,
      problem: errorCode(error, "IMAGE_DECODE_FAILED"),
      size: null,
    }));
  }
}

function finishWhenDecoded(
  fileName: string,
  objectUrl: string,
  id: number,
  onReady?: () => void,
): Promise<void> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => {
      if (id !== requestId) {
        resolve();
        return;
      }
      const width = probe.naturalWidth;
      const height = probe.naturalHeight;
      imageDocumentStore.setState(() => ({
        status: "ready",
        fileName,
        objectUrl,
        problem: null,
        size: width > 0 && height > 0 ? { width, height } : null,
      }));
      onReady?.();
      resolve();
    };
    probe.onerror = () => {
      if (id !== requestId) {
        resolve();
        return;
      }
      if (activeUrl === objectUrl) {
        URL.revokeObjectURL(objectUrl);
        activeUrl = null;
      }
      imageDocumentStore.setState(() => ({
        status: "error",
        fileName,
        objectUrl: null,
        problem: "IMAGE_DECODE_FAILED",
        size: null,
      }));
      resolve();
    };
    probe.src = objectUrl;
  });
}

function publishTiffProgress(
  id: number,
  fileName: string,
): (ratio: number) => void {
  let shown = -1;
  return (ratio: number) => {
    if (id !== requestId) return;
    const next = Math.max(0, Math.min(1, ratio));
    if (next < 1 && next - shown < 0.004) return;
    shown = next;
    imageDocumentStore.setState(() => ({
      status: "loading",
      fileName,
      objectUrl: null,
      problem: null,
      size: null,
      progress: next,
    }));
  };
}

function isLikelyImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_NAME.test(file.name);
}

function releaseActiveUrl(): void {
  if (!activeUrl) return;
  URL.revokeObjectURL(activeUrl);
  activeUrl = null;
}
