import { Store } from "@tanstack/store";
import { addFreeMark, deleteMark, lineStore, type LineState } from "./lines.ts";
import { isFreeMark, markRadius, type PointMark } from "./point-marks.ts";
import { primaryModifier } from "./viewport.ts";

type CopiedMark = { mark: PointMark; x: number; y: number; size: number };

/** The characteristic Cut or Copy took, and how many times it has been pasted. */
export const markClipboardStore = new Store<{
  copied: CopiedMark;
  pastes: number;
} | null>(null);

/** The selected characteristic. Null when nothing or a route mark is selected. */
export function selectedCharacteristic(state: LineState): CopiedMark | null {
  if (state.markId === null) return null;
  const point = state.points.find((item) => item.id === state.markId);
  if (!point || !isFreeMark(point.mark)) return null;
  return { mark: point.mark, x: point.x, y: point.y, size: point.size };
}

/** Command-X, -C, and -V. The letter follows the keyboard layout. */
export function clipboardCommand(
  event: KeyboardEvent,
): "cut" | "copy" | "paste" | null {
  if (event.isComposing || event.altKey || event.shiftKey) return null;
  if (!primaryModifier(event)) return null;
  const key = event.key.toLowerCase();
  if (key === "x") return "cut";
  if (key === "c") return "copy";
  if (key === "v") return "paste";
  return null;
}

export function runClipboardCommand(
  command: "cut" | "copy" | "paste",
): boolean {
  if (command === "cut") return cutMark();
  if (command === "copy") return copyMark();
  return pasteMark();
}

export function copyMark(): boolean {
  const copied = selectedCharacteristic(lineStore.get());
  if (!copied) return false;
  markClipboardStore.setState(() => ({ copied, pastes: 0 }));
  return true;
}

/** Copies the selected characteristic and removes it. The first paste puts it back in place. */
export function cutMark(): boolean {
  const state = lineStore.get();
  const copied = selectedCharacteristic(state);
  if (!copied || state.markId === null) return false;
  markClipboardStore.setState(() => ({ copied, pastes: -1 }));
  deleteMark(state.markId);
  return true;
}

/** Places a copy and selects it. Each paste steps down and right by one mark radius. */
export function pasteMark(): boolean {
  const clip = markClipboardStore.get();
  if (!clip) return false;
  const pastes = clip.pastes + 1;
  const { mark, x, y, size } = clip.copied;
  const step = markRadius(lineStore.get().scale, mark, size) * pastes;
  addFreeMark(mark, x + step, y + step, size);
  markClipboardStore.setState(() => ({ copied: clip.copied, pastes }));
  return true;
}
