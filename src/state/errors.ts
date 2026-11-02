/** Stable ids for every failure Topo reports. Each locale has a message for each one. */
export const ERROR_CODES = [
  "APP_ROOT_MISSING",
  "IMAGE_NOT_SUPPORTED",
  "IMAGE_DECODE_FAILED",
  "TIFF_LIBRARY_FAILED",
  "TIFF_DECODE_FAILED",
  "TIFF_ENCODE_FAILED",
  "EXPORT_NO_IMAGE",
  "EXPORT_IMAGE_UNREADABLE",
  "EXPORT_CANVAS_UNAVAILABLE",
  "EXPORT_ENCODE_FAILED",
  "EXPORT_FAILED",
  "TOPO_FILE_INVALID",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** `message` is the code. Translate it with `errorMessage` from the i18n module. */
export class TopoError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, options?: { cause?: unknown }) {
    super(code, options);
    this.name = "TopoError";
    this.code = code;
  }
}

/** The code a `TopoError` carries, or `fallback` for anything else. */
export function errorCode(error: unknown, fallback: ErrorCode): ErrorCode {
  return error instanceof TopoError ? error.code : fallback;
}
