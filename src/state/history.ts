import { Store } from "@tanstack/store";
import type { ExitArrow, LineLayer, MarkedPoint, TextLabel } from "./lines.ts";
import { primaryModifier } from "./viewport.ts";

/** Drawing document at one undo step. Selection is restored with it. */
export type LineCheckpoint = {
  layers: LineLayer[];
  points: MarkedPoint[];
  labels: TextLabel[];
  exits: ExitArrow[];
  scale: number;
  activeId: string | null;
  anchorIndex: number | null;
};

type HistoryBinding = {
  read: () => LineCheckpoint;
  write: (checkpoint: LineCheckpoint) => void;
  /** True when the live drawing matches this checkpoint. Selection is ignored. */
  same: (checkpoint: LineCheckpoint) => boolean;
};

type HistoryAvailability = {
  canUndo: boolean;
  canRedo: boolean;
};

const HISTORY_LIMIT = 100;

export const historyStore = new Store<HistoryAvailability>({
  canUndo: false,
  canRedo: false,
});

let binding: HistoryBinding | null = null;
let undoStack: LineCheckpoint[] = [];
let redoStack: LineCheckpoint[] = [];
/** Drawing before the open step. Anchors are mutated in place, so this is a copy. */
let open: LineCheckpoint | null = null;
let coalesce: string | null = null;
let depth = 0;
let applying = false;
let releaseListener: ((event: Event) => void) | null = null;

export function bindLineHistory(next: HistoryBinding): void {
  binding = next;
}

/**
 * Starts a step. Nested calls join the step already open, so a drag is one undo.
 * The same coalesce key keeps the original checkpoint, so a slider drag is one undo.
 */
export function beginHistory(coalesceKey?: string): void {
  if (applying) return;
  if (depth > 0) {
    depth += 1;
    return;
  }
  if (coalesceKey && coalesce === coalesceKey && open) {
    depth += 1;
    return;
  }
  seal();
  if (!binding) return;
  open = binding.read();
  coalesce = coalesceKey ?? null;
  depth = 1;
}

/** Closes one `beginHistory`. The outermost close records the step. */
export function endHistory(): void {
  if (applying || depth === 0) return;
  depth -= 1;
  if (depth > 0) return;
  if (holdsForRelease(coalesce)) {
    publishAvailability();
    armRelease();
    return;
  }
  seal();
}

export function undo(): void {
  if (applying || depth > 0) return;
  seal();
  const previous = undoStack.pop();
  if (!previous || !binding) {
    publishAvailability();
    return;
  }
  const current = binding.read();
  applying = true;
  try {
    binding.write(previous);
  } finally {
    applying = false;
  }
  redoStack.push(current);
  publishAvailability();
}

export function redo(): void {
  if (applying || depth > 0) return;
  seal();
  const next = redoStack.pop();
  if (!next || !binding) {
    publishAvailability();
    return;
  }
  const current = binding.read();
  applying = true;
  try {
    binding.write(next);
  } finally {
    applying = false;
  }
  undoStack.push(current);
  publishAvailability();
}

/** True when a reload would drop drawing steps still on the undo stack. */
export function hasUnsavedHistory(): boolean {
  return historyStore.get().canUndo;
}

/** Drops every step. Opening another photo starts a blank history. */
export function resetHistory(): void {
  undoStack = [];
  redoStack = [];
  open = null;
  coalesce = null;
  depth = 0;
  disarmScaleRelease();
  publishAvailability();
}

/** Command-Z undoes. Command-Shift-Z and Ctrl-Y redo. The letter follows the keyboard layout. */
export function historyCommand(event: KeyboardEvent): "undo" | "redo" | null {
  if (event.isComposing || event.altKey || !primaryModifier(event)) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !event.shiftKey) return "redo";
  return null;
}

const TEXT_INPUT = new Set([
  "text",
  "search",
  "email",
  "password",
  "url",
  "tel",
  "number",
]);

/** Layer names undo with the drawing. Other text fields keep the browser's undo. */
export function blocksHistoryCommand(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  if (!TEXT_INPUT.has(target.type)) return false;
  return !target.closest("[data-layers]");
}

function seal(): void {
  disarmScaleRelease();
  const checkpoint = open;
  open = null;
  coalesce = null;
  if (!checkpoint || !binding || binding.same(checkpoint)) {
    publishAvailability();
    return;
  }
  undoStack.push(checkpoint);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  publishAvailability();
}

function publishAvailability(): void {
  const pending = open !== null && binding !== null && !binding.same(open);
  const next = {
    canUndo: undoStack.length > 0 || pending,
    canRedo: redoStack.length > 0 && !pending,
  };
  const current = historyStore.get();
  if (current.canUndo === next.canUndo && current.canRedo === next.canRedo) {
    return;
  }
  historyStore.setState(() => next);
}

/** Scale and number drags keep one checkpoint until the pointer or key goes up. */
function holdsForRelease(key: string | null): boolean {
  return key === "scale" || (key?.startsWith("number:") ?? false);
}

function armRelease(): void {
  if (releaseListener) return;
  const onRelease = (event: Event) => {
    if (!isRelease(event)) return;
    disarmScaleRelease();
    if (depth === 0 && holdsForRelease(coalesce)) seal();
  };
  releaseListener = onRelease;
  window.addEventListener("pointerup", onRelease, true);
  window.addEventListener("pointercancel", onRelease, true);
  window.addEventListener("keyup", onRelease, true);
  window.addEventListener("blur", onRelease);
}

function disarmScaleRelease(): void {
  const onRelease = releaseListener;
  if (!onRelease) return;
  releaseListener = null;
  window.removeEventListener("pointerup", onRelease, true);
  window.removeEventListener("pointercancel", onRelease, true);
  window.removeEventListener("keyup", onRelease, true);
  window.removeEventListener("blur", onRelease);
}

function isRelease(event: Event): boolean {
  if (
    event.type === "pointerup" ||
    event.type === "pointercancel" ||
    event.type === "blur"
  ) {
    return true;
  }
  if (!(event instanceof KeyboardEvent) || event.repeat) return false;
  return (
    event.key !== "Shift" &&
    event.key !== "Control" &&
    event.key !== "Meta" &&
    event.key !== "Alt"
  );
}
