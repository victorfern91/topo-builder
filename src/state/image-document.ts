import { Store } from "@tanstack/store";
import { isTiffFile, tiffToPngBlob } from "./tiff.ts";

export type ImageProblem = "not-a-picture" | "cannot-decode";

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
      problem: ImageProblem;
      size: null;
    };

export const IMAGE_FILE_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/tiff,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.avif,.bmp,.tif,.tiff,.svg";

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

export function openImageFile(file: File): void {
  const id = ++requestId;

  if (!isLikelyImageFile(file)) {
    releaseActiveUrl();
    imageDocumentStore.setState(() => ({
      status: "error",
      fileName: file.name,
      objectUrl: null,
      problem: "not-a-picture",
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
    void placeTiff(file, id);
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

  void finishWhenDecoded(file.name, objectUrl, id);
}

async function placeTiff(file: File, id: number): Promise<void> {
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
    await finishWhenDecoded(file.name, objectUrl, id);
  } catch {
    if (id !== requestId) return;
    releaseActiveUrl();
    imageDocumentStore.setState(() => ({
      status: "error",
      fileName: file.name,
      objectUrl: null,
      problem: "cannot-decode",
      size: null,
    }));
  }
}

function finishWhenDecoded(
  fileName: string,
  objectUrl: string,
  id: number,
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
        problem: "cannot-decode",
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
