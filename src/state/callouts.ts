import { t } from "../i18n/index.ts";
import type { LineHit, TextEdge } from "./lines.ts";
import {
  edit,
  findLayer,
  framePad,
  HIT_PX,
  LINE_COLORS,
  lineHoverStore,
  lineStore,
  patch,
  publish,
  setLineHover,
  strokeDistance2,
  type ExitArrow,
  type LineState,
  type RouteNote,
  type TextLabel,
} from "./lines.ts";
import {
  numberFromPointer,
  numberMagnet,
  placementAt,
  sameRouteNumber,
} from "./route-number.ts";

/** How far a new exit arrow reaches, in image pixels. */
const EXIT_LENGTH = 56;

const FAMILY = '"PT Sans", sans-serif';
const NOTE_SIZE = 11;
const LABEL_SIZE = 14;
const WEIGHT = 700;
const TEXT_PAD = 6;
/** Line box over the font size. Paint, hit testing, and the editor share it. */
export const CALLOUT_LEADING = 1.2;
const TEXT_WIDTH_MAX = 640;

const TEXT_EDGES = ["w", "e"] as const satisfies readonly TextEdge[];

let noteSequence = 0;
let labelSequence = 0;
let exitSequence = 0;

let measureContext: CanvasRenderingContext2D | null | undefined;

export function nextNoteId(): string {
  noteSequence += 1;
  return `note-${noteSequence}`;
}

function nextLabelId(): string {
  labelSequence += 1;
  return `label-${labelSequence}`;
}

function nextExitId(): string {
  exitSequence += 1;
  return `exit-${exitSequence}`;
}

/** Raises id counters so a loaded drawing does not reuse an id. */
export function adoptCalloutSequences(checkpoint: {
  layers: readonly { notes: readonly { id: string }[] }[];
  labels: readonly { id: string }[];
  exits: readonly { id: string }[];
}): void {
  for (const layer of checkpoint.layers) {
    for (const note of layer.notes) bumpNote(note.id);
  }
  for (const label of checkpoint.labels) bumpLabel(label.id);
  for (const exit of checkpoint.exits) bumpExit(exit.id);
}

export function calloutFontSize(kind: "note" | "label"): number {
  return kind === "note" ? NOTE_SIZE : LABEL_SIZE;
}

/** Wrap width at scale 1. A step off the range is pulled back in. */
export function clampTextWidth(width: number, kind: "note" | "label"): number {
  const min = calloutFontSize(kind) + TEXT_PAD;
  if (!Number.isFinite(width)) return min;
  return Math.min(TEXT_WIDTH_MAX, Math.max(min, width));
}

export function calloutFont(kind: "note" | "label"): string {
  return `${WEIGHT} ${calloutFontSize(kind)}px ${FAMILY}`;
}

export function loadCalloutFonts(): Promise<unknown> {
  return Promise.all([
    document.fonts.load(calloutFont("note")),
    document.fonts.load(calloutFont("label")),
  ]).catch(() => undefined);
}

export type CalloutLayout = {
  /** Box width at scale 1, including padding. */
  width: number;
  /** Box height at scale 1. Grows with each wrapped line. */
  height: number;
  lines: readonly string[];
};

/**
 * Box at scale 1. `width` null hugs the text on its own lines.
 * A number is the wrap width: words that do not fit move to the next line.
 */
export function calloutLayout(
  text: string,
  kind: "note" | "label",
  width: number | null,
): CalloutLayout {
  const size = calloutFontSize(kind);
  const leading = size * CALLOUT_LEADING;
  const limit = width === null ? null : Math.max(size, width - TEXT_PAD);
  const lines = layoutLines(text, kind, limit);
  const measured = lines.reduce(
    (max, line) => Math.max(max, measureLine(line, kind)),
    0,
  );
  const content = limit ?? Math.max(size, measured);
  return {
    width: content + TEXT_PAD,
    height: lines.length * leading + TEXT_PAD,
    lines,
  };
}

/** Unlocked route, with two anchors, whose magnet band holds (x, y). */
export function noteLandingAt(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): { layerId: string; x: number; y: number } | null {
  const reach = Math.max(numberMagnet().reach, zoom > 0 ? HIT_PX / zoom : 0);
  let best: { layerId: string; x: number; y: number } | null = null;
  let bestDist = reach * reach;
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || layer.locked || layer.anchors.length < 2) continue;
    const dist = strokeDistance2(layer, x, y);
    if (dist >= bestDist) continue;
    best = { layerId: layer.id, x, y };
    bestDist = dist;
  }
  return best;
}

export function selectCallout(id: string): void {
  patch((draft) => {
    if (!hasCallout(draft, id)) return;
    if (
      draft.calloutId === id &&
      draft.activeId === null &&
      draft.anchorIndex === null &&
      draft.markId === null
    )
      return;
    draft.calloutId = id;
    draft.activeId = null;
    draft.anchorIndex = null;
    draft.markId = null;
  });
}

/** Observation beside the route, in the magnet band under (x, y). */
export function addNote(layerId: string, x: number, y: number): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    if (!layer || layer.locked || layer.anchors.length < 2) return;
    const place = numberFromPointer(layer, x, y, 1);
    if (!place) return;
    const note: RouteNote = {
      id: nextNoteId(),
      text: t("defaultObservation"),
      place,
      width: null,
    };
    patch((draft) => {
      const target = draft.layers.find((item) => item.id === layerId);
      if (!target) return;
      target.notes.push(note);
      draft.calloutId = note.id;
      draft.activeId = null;
      draft.anchorIndex = null;
      draft.markId = null;
      draft.revision += 1;
    });
  });
}

export function addLabel(x: number, y: number): void {
  edit(() => {
    const label: TextLabel = {
      id: nextLabelId(),
      text: t("defaultText"),
      x,
      y,
      color: nextColor(),
      locked: false,
      width: null,
    };
    patch((draft) => {
      draft.labels.push(label);
      draft.calloutId = label.id;
      draft.activeId = null;
      draft.anchorIndex = null;
      draft.markId = null;
      draft.revision += 1;
    });
  });
}

/** Tail at (x, y). The tip points up the photo, ready to be aimed. */
export function addExit(x: number, y: number): void {
  edit(() => {
    const exit: ExitArrow = {
      id: nextExitId(),
      x,
      y,
      tipX: x,
      tipY: y - EXIT_LENGTH,
      color: nextColor(),
      locked: false,
    };
    patch((draft) => {
      draft.exits.push(exit);
      draft.calloutId = exit.id;
      draft.activeId = null;
      draft.anchorIndex = null;
      draft.markId = null;
      draft.revision += 1;
    });
  });
}

export function moveNote(
  layerId: string,
  noteId: string,
  x: number,
  y: number,
): void {
  edit(() => {
    const layer = findLayer(lineStore.get(), layerId);
    const note = layer?.notes.find((item) => item.id === noteId);
    if (!layer || !note || layer.locked) return;
    const next = numberFromPointer(layer, x, y, note.place.side);
    if (!next || sameRouteNumber(note.place, next)) return;
    note.place = next;
    publish();
  });
}

export function moveLabel(id: string, x: number, y: number): void {
  edit(() => {
    const label = lineStore.get().labels.find((item) => item.id === id);
    if (!label || label.locked || (label.x === x && label.y === y)) return;
    label.x = x;
    label.y = y;
    publish();
  });
}

/** Sets the wrap width. The center stays put and the letters keep their size. */
export function resizeTextWidth(
  id: string,
  width: number,
  kind: "note" | "label",
): void {
  edit(() => {
    const next = clampTextWidth(width, kind);
    const state = lineStore.get();
    const label = state.labels.find((item) => item.id === id);
    if (label) {
      if (label.locked || label.width === next) return;
      label.width = next;
      publish();
      return;
    }
    for (const layer of state.layers) {
      const note = layer.notes.find((item) => item.id === id);
      if (!note) continue;
      if (layer.locked || note.width === next) return;
      note.width = next;
      publish();
      return;
    }
  });
}

/** Frame around the selected text. Null when none is selected or it is locked. */
export function textFrame(
  state: LineState,
  zoom: number,
): {
  kind: "note" | "label";
  id: string;
  layerId: string | null;
  x: number;
  y: number;
  halfW: number;
  halfH: number;
  /** Box width at scale 1. */
  width: number;
  base: number;
} | null {
  if (state.calloutId === null || !(zoom > 0)) return null;
  const pad = framePad(zoom);
  const label = state.labels.find((item) => item.id === state.calloutId);
  if (label) {
    if (label.locked || !(state.scale > 0)) return null;
    const box = calloutLayout(label.text, "label", label.width);
    return {
      kind: "label",
      id: label.id,
      layerId: null,
      x: label.x,
      y: label.y,
      halfW: (box.width * state.scale) / 2 + pad,
      halfH: (box.height * state.scale) / 2 + pad,
      width: box.width,
      base: state.scale,
    };
  }
  for (const layer of state.layers) {
    const note = layer.notes.find((item) => item.id === state.calloutId);
    if (!note) continue;
    if (layer.locked || !(layer.scale > 0)) return null;
    const place = placementAt(layer, note.place);
    if (!place) return null;
    const box = calloutLayout(note.text, "note", note.width);
    return {
      kind: "note",
      id: note.id,
      layerId: layer.id,
      x: place.x,
      y: place.y,
      halfW: (box.width * layer.scale) / 2 + pad,
      halfH: (box.height * layer.scale) / 2 + pad,
      width: box.width,
      base: layer.scale,
    };
  }
  return null;
}

/** Left or right edge of the selected text. Checked before the letters. */
export function textEdgeAt(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): LineHit | null {
  const frame = textFrame(state, zoom);
  if (!frame) return null;
  const reach = HIT_PX / zoom;
  for (const edge of TEXT_EDGES) {
    const sign = edge === "e" ? 1 : -1;
    const cx = frame.x + sign * frame.halfW;
    if (Math.abs(x - cx) > reach || Math.abs(y - frame.y) > reach) continue;
    if (frame.kind === "label")
      return { type: "labelEdge", labelId: frame.id, edge };
    if (frame.layerId === null) return null;
    return {
      type: "noteEdge",
      layerId: frame.layerId,
      noteId: frame.id,
      edge,
    };
  }
  return null;
}

export function moveExit(
  id: string,
  next: { x: number; y: number; tipX: number; tipY: number },
): void {
  edit(() => {
    const exit = lineStore.get().exits.find((item) => item.id === id);
    if (
      !exit ||
      exit.locked ||
      (exit.x === next.x &&
        exit.y === next.y &&
        exit.tipX === next.tipX &&
        exit.tipY === next.tipY)
    )
      return;
    exit.x = next.x;
    exit.y = next.y;
    exit.tipX = next.tipX;
    exit.tipY = next.tipY;
    publish();
  });
}

export function setNoteText(id: string, text: string): void {
  edit(() => {
    patch((draft) => {
      for (const layer of draft.layers) {
        const note = layer.notes.find((item) => item.id === id);
        if (!note) continue;
        if (layer.locked || note.text === text) return;
        note.text = text;
        draft.revision += 1;
        return;
      }
    });
  });
}

export function setLabelText(id: string, text: string): void {
  edit(() => {
    patch((draft) => {
      const label = draft.labels.find((item) => item.id === id);
      if (!label || label.locked || label.text === text) return;
      label.text = text;
      draft.revision += 1;
    });
  });
}

export function setLabelColor(id: string, color: string): void {
  if (!isPaletteColor(color)) return;
  edit(() => {
    patch((draft) => {
      const label = draft.labels.find((item) => item.id === id);
      if (!label || label.locked || label.color === color) return;
      label.color = color;
      draft.revision += 1;
    });
  });
}

export function setExitColor(id: string, color: string): void {
  if (!isPaletteColor(color)) return;
  edit(() => {
    patch((draft) => {
      const exit = draft.exits.find((item) => item.id === id);
      if (!exit || exit.locked || exit.color === color) return;
      exit.color = color;
      draft.revision += 1;
    });
  });
}

export function toggleLabelLock(id: string): void {
  edit(() => {
    patch((draft) => {
      const label = draft.labels.find((item) => item.id === id);
      if (!label) return;
      label.locked = !label.locked;
      draft.revision += 1;
    });
  });
}

export function toggleExitLock(id: string): void {
  edit(() => {
    patch((draft) => {
      const exit = draft.exits.find((item) => item.id === id);
      if (!exit) return;
      exit.locked = !exit.locked;
      draft.revision += 1;
    });
  });
}

export function deleteCallout(id: string): void {
  edit(() => {
    const hover = hoverMatches(id);
    patch((draft) => {
      let removed = false;
      for (const layer of draft.layers) {
        const index = layer.notes.findIndex((note) => note.id === id);
        if (index < 0) continue;
        if (layer.locked) return;
        layer.notes.splice(index, 1);
        removed = true;
        break;
      }
      if (!removed) {
        const label = draft.labels.find((item) => item.id === id);
        const exit = draft.exits.find((item) => item.id === id);
        if (label?.locked || exit?.locked) return;
        const labels = draft.labels.filter((item) => item.id !== id);
        const exits = draft.exits.filter((item) => item.id !== id);
        removed =
          labels.length !== draft.labels.length ||
          exits.length !== draft.exits.length;
        draft.labels = labels;
        draft.exits = exits;
      }
      if (!removed) return;
      if (draft.calloutId === id) draft.calloutId = null;
      draft.revision += 1;
    });
    if (hover && !hasCallout(lineStore.get(), id)) setLineHover(null);
  });
}

/** Tip or tail of an unlocked exit arrow. Checked before the shaft. */
export function calloutHandleAt(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): LineHit | null {
  if (!(zoom > 0)) return null;
  const limit = Math.max(HIT_PX, 7) / zoom;
  const limit2 = limit * limit;
  let best: { hit: LineHit; dist: number } | null = null;
  for (const exit of state.exits) {
    if (exit.locked) continue;
    const tip = distance2(exit.tipX, exit.tipY, x, y);
    const tail = distance2(exit.x, exit.y, x, y);
    if (tip <= limit2 && (!best || tip < best.dist)) {
      best = { hit: { type: "exitTip", exitId: exit.id }, dist: tip };
    }
    if (tail <= limit2 && (!best || tail < best.dist)) {
      best = { hit: { type: "exitTail", exitId: exit.id }, dist: tail };
    }
  }
  return best?.hit ?? null;
}

/** Nearest note, text label, or exit shaft under the pointer. */
export function nearestCallout(
  state: LineState,
  x: number,
  y: number,
  zoom: number,
): { hit: LineHit; dist: number } | null {
  if (!(zoom > 0)) return null;
  let best: { hit: LineHit; dist: number } | null = null;
  const consider = (hit: LineHit, dist: number) => {
    if (!best || dist < best.dist) best = { hit, dist };
  };
  for (
    let layerIndex = state.layers.length - 1;
    layerIndex >= 0;
    layerIndex -= 1
  ) {
    const layer = state.layers[layerIndex];
    if (!layer || !(layer.scale > 0)) continue;
    for (const note of layer.notes) {
      const place = placementAt(layer, note.place);
      if (!place) continue;
      const box = calloutLayout(note.text, "note", note.width);
      const dx = (x - place.x) / layer.scale;
      const dy = (y - place.y) / layer.scale;
      if (Math.abs(dx) > box.width / 2 || Math.abs(dy) > box.height / 2)
        continue;
      consider(
        { type: "note", layerId: layer.id, noteId: note.id },
        distance2(place.x, place.y, x, y),
      );
    }
  }
  const labelScale = state.scale > 0 ? state.scale : 0;
  if (labelScale > 0) {
    for (const label of state.labels) {
      const box = calloutLayout(label.text, "label", label.width);
      const dx = (x - label.x) / labelScale;
      const dy = (y - label.y) / labelScale;
      if (Math.abs(dx) > box.width / 2 || Math.abs(dy) > box.height / 2)
        continue;
      consider(
        { type: "label", labelId: label.id },
        distance2(label.x, label.y, x, y),
      );
    }
  }
  const shaft = HIT_PX / zoom + (state.scale > 0 ? state.scale : 1);
  const shaft2 = shaft * shaft;
  for (const exit of state.exits) {
    const dist = segmentDistance2(exit.x, exit.y, exit.tipX, exit.tipY, x, y);
    if (dist > shaft2) continue;
    consider({ type: "exit", exitId: exit.id }, dist);
  }
  return best;
}

function hoverMatches(id: string): boolean {
  const hover = lineHoverStore.get();
  if (!hover) return false;
  if (hover.type === "note" || hover.type === "noteEdge")
    return hover.noteId === id;
  if (hover.type === "label" || hover.type === "labelEdge")
    return hover.labelId === id;
  if (
    hover.type === "exit" ||
    hover.type === "exitTip" ||
    hover.type === "exitTail"
  )
    return hover.exitId === id;
  return false;
}

function hasCallout(state: LineState, id: string): boolean {
  if (state.labels.some((item) => item.id === id)) return true;
  if (state.exits.some((item) => item.id === id)) return true;
  return state.layers.some((layer) =>
    layer.notes.some((note) => note.id === id),
  );
}

function nextColor(): string {
  const state = lineStore.get();
  const count = state.layers.length + state.labels.length + state.exits.length;
  return LINE_COLORS[count % LINE_COLORS.length] ?? LINE_COLORS[0];
}

function isPaletteColor(color: string): boolean {
  return (LINE_COLORS as readonly string[]).includes(color);
}

function bumpNote(id: string): void {
  const value = trailingId(id);
  if (value > noteSequence) noteSequence = value;
}

function bumpLabel(id: string): void {
  const value = trailingId(id);
  if (value > labelSequence) labelSequence = value;
}

function bumpExit(id: string): void {
  const value = trailingId(id);
  if (value > exitSequence) exitSequence = value;
}

function trailingId(id: string): number {
  const dash = id.lastIndexOf("-");
  if (dash < 0) return 0;
  const value = Number(id.slice(dash + 1));
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function layoutLines(
  text: string,
  kind: "note" | "label",
  limit: number | null,
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (limit === null) {
      lines.push(paragraph);
      continue;
    }
    lines.push(...wrapParagraph(paragraph, kind, limit));
  }
  return lines.length > 0 ? lines : [""];
}

function wrapParagraph(
  paragraph: string,
  kind: "note" | "label",
  limit: number,
): string[] {
  if (paragraph === "") return [""];
  const words = paragraph.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (measureLine(candidate, kind) <= limit) {
      current = candidate;
      continue;
    }
    if (current !== "") lines.push(current);
    if (word === "" || measureLine(word, kind) <= limit) {
      current = word;
      continue;
    }
    current = breakWord(word, kind, limit, lines);
  }
  lines.push(current);
  return lines;
}

function breakWord(
  word: string,
  kind: "note" | "label",
  limit: number,
  lines: string[],
): string {
  let chunk = "";
  for (const char of word) {
    const next = chunk + char;
    if (measureLine(next, kind) <= limit) {
      chunk = next;
      continue;
    }
    if (chunk !== "") lines.push(chunk);
    chunk = char;
  }
  return chunk;
}

function measureLine(line: string, kind: "note" | "label"): number {
  const context = measureCtx();
  if (!context) return line.length * calloutFontSize(kind) * 0.56;
  context.font = calloutFont(kind);
  return context.measureText(line).width;
}

function measureCtx(): CanvasRenderingContext2D | null {
  if (measureContext === undefined) {
    measureContext = document.createElement("canvas").getContext("2d");
  }
  return measureContext;
}

function distance2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function segmentDistance2(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distance2(x1, y1, x, y);
  const t = Math.min(1, Math.max(0, ((x - x1) * dx + (y - y1) * dy) / len2));
  return distance2(x1 + dx * t, y1 + dy * t, x, y);
}
