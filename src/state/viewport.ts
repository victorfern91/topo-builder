import { Store } from "@tanstack/store";
import {
  flushPreferences,
  preferencesStore,
  saveWidgetPlacement,
  type WidgetPreferenceId,
} from "./preferences.ts";

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 64;
export const ZOOM_STEP = 1.25;
const PANEL_MARGIN = 12;
const VIEW_MARGIN = 32;
const DOCK_SNAP = 28;

export type WidgetId = WidgetPreferenceId;

export type UserAction = "idle" | "pan" | "minimap" | WidgetId;

export type WidgetFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  custom: boolean;
};

export type ContentPlacement = "fit" | "center";

export type ZoomOrigin = { x: number; y: number } | "center";

export type ViewportKeyId =
  "zoom-in" | "zoom-out" | "fit" | "actual-size" | "pan";

export type ViewportKeys = Record<ViewportKeyId, string>;

export type ViewportState = {
  zoom: number;
  panX: number;
  panY: number;
  viewWidth: number;
  viewHeight: number;
  contentWidth: number;
  contentHeight: number;
  contentKey: string;
  placement: ContentPlacement;
  fittedKey: string;
  spaceHeld: boolean;
  userAction: UserAction;
  frames: Record<WidgetId, WidgetFrame>;
};

export type MinimapLayout = {
  scale: number;
  contentX: number;
  contentY: number;
  contentW: number;
  contentH: number;
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
};

const FRAME_SIZE: Record<WidgetId, { width: number; height: number }> = {
  tools: { width: 48, height: 120 },
  navigator: { width: 216, height: 248 },
  layers: { width: 280, height: 160 },
};

const WIDGET_IDS = [
  "tools",
  "navigator",
  "layers",
] as const satisfies readonly WidgetId[];

function emptyFrame(id: WidgetId): WidgetFrame {
  const size = FRAME_SIZE[id];
  return {
    x: PANEL_MARGIN,
    y: PANEL_MARGIN,
    width: size.width,
    height: size.height,
    custom: false,
  };
}

const initialViewport: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  viewWidth: 0,
  viewHeight: 0,
  contentWidth: 0,
  contentHeight: 0,
  contentKey: "",
  placement: "center",
  fittedKey: "",
  spaceHeld: false,
  userAction: "idle",
  frames: {
    tools: emptyFrame("tools"),
    navigator: emptyFrame("navigator"),
    layers: emptyFrame("layers"),
  },
};

export const viewportStore = new Store(initialViewport, (store) => ({
  zoomBy(factor: number, origin: ZoomOrigin = "center") {
    store.setState((state) => zoomAt(state, state.zoom * factor, origin));
  },
  zoomTo(zoom: number, origin: ZoomOrigin = "center") {
    store.setState((state) => zoomAt(state, zoom, origin));
  },
  zoomIn() {
    store.setState((state) => zoomAt(state, state.zoom * ZOOM_STEP, "center"));
  },
  zoomOut() {
    store.setState((state) => zoomAt(state, state.zoom / ZOOM_STEP, "center"));
  },
  fit() {
    store.setState((state) => placeFitted(state));
  },
  actualSize() {
    store.setState((state) => zoomAt(state, 1, "center"));
  },
  panBy(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return;
    store.setState((state) => ({
      ...state,
      panX: state.panX + dx,
      panY: state.panY + dy,
    }));
  },
  centerOn(contentX: number, contentY: number) {
    store.setState((state) => ({
      ...state,
      panX: state.viewWidth / 2 - contentX * state.zoom,
      panY: state.viewHeight / 2 - contentY * state.zoom,
    }));
  },
  setSpaceHeld(held: boolean) {
    store.setState((state) =>
      state.spaceHeld === held ? state : { ...state, spaceHeld: held },
    );
  },
  setUserAction(userAction: UserAction) {
    store.setState((state) =>
      state.userAction === userAction ? state : { ...state, userAction },
    );
  },
  resizeView(width: number, height: number) {
    store.setState((state) => resizeView(state, width, height));
  },
  resizeContent(
    key: string,
    width: number,
    height: number,
    placement: ContentPlacement,
  ) {
    store.setState((state) =>
      resizeContent(state, key, width, height, placement),
    );
  },
  resizeFrame(id: WidgetId, width: number, height: number) {
    store.setState((state) => {
      const frame = state.frames[id];
      if (frame.width === width && frame.height === height) return state;
      return clampFrame(writeFrame(state, id, { width, height }), id);
    });
  },
  moveFrame(id: WidgetId, x: number, y: number) {
    store.setState((state) => {
      const next = clampFrame(
        writeFrame(state, id, { x, y, custom: true }),
        id,
      );
      rememberFrame(id, next);
      return next;
    });
  },
  dropFrame(id: WidgetId) {
    store.setState((state) => {
      const frame = state.frames[id];
      if (!frame.custom) return state;
      const docked = dockedOrigin(state, id);
      const near =
        Math.abs(frame.x - docked.x) <= DOCK_SNAP &&
        Math.abs(frame.y - docked.y) <= DOCK_SNAP;
      if (!near) return state;
      const next = clampFrame(writeFrame(state, id, { custom: false }), id);
      rememberFrame(id, next);
      return next;
    });
    flushPreferences();
  },
}));

export type ViewportActions = typeof viewportStore.actions;

export type ViewportContextValue = {
  actions: ViewportActions;
  keys: ViewportKeys;
  getState: () => ViewportState;
};

export function shortcutChords(panLabel: string): ViewportKeys {
  const apple = /\b(Mac|iPhone|iPad|iPod)\b/i.test(navigator.userAgent);
  if (apple) {
    return {
      "zoom-in": "⌘+",
      "zoom-out": "⌘−",
      fit: "⌘0",
      "actual-size": "⌘1",
      pan: panLabel,
    };
  }
  return {
    "zoom-in": "Ctrl++",
    "zoom-out": "Ctrl+−",
    fit: "Ctrl+0",
    "actual-size": "Ctrl+1",
    pan: panLabel,
  };
}

export function matchViewportKey(
  event: KeyboardEvent,
): Exclude<ViewportKeyId, "pan"> | null {
  if (event.isComposing || event.altKey) return null;
  if (!primaryModifier(event)) return null;
  if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd")
    return "zoom-in";
  if (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract")
    return "zoom-out";
  if (event.shiftKey) return null;
  if (event.key === "0" || event.code === "Numpad0") return "fit";
  if (event.key === "1" || event.code === "Numpad1") return "actual-size";
  return null;
}

/** Command on Mac, Control on Windows. Both together are a different chord. */
export function primaryModifier(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !(event.metaKey && event.ctrlKey);
}

/** Bare Backspace (Mac Delete) or Delete (Windows). Command and Control stay free for other shortcuts. */
export function isPlainDelete(event: KeyboardEvent): boolean {
  if (
    event.isComposing ||
    event.altKey ||
    primaryModifier(event) ||
    (event.metaKey && event.ctrlKey)
  )
    return false;
  return (
    event.key === "Backspace" ||
    event.key === "Delete" ||
    event.code === "Backspace" ||
    event.code === "Delete"
  );
}

export function wheelDelta(delta: number, mode: number): number {
  if (mode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
  if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * 240;
  return delta;
}

export function zoomFactorFromWheel(deltaY: number, mode: number): number {
  return Math.exp(-wheelDelta(deltaY, mode) * 0.0018);
}

export function formatZoomPercent(zoom: number): string {
  const percent = zoom * 100;
  if (percent >= 10) return `${Math.round(percent)}%`;
  return `${percent.toFixed(1)}%`;
}

export function zoomToSlider(zoom: number): number {
  const span = Math.log(MAX_ZOOM / MIN_ZOOM);
  const t = Math.log(clampZoom(zoom) / MIN_ZOOM) / span;
  return Math.round(t * 1000);
}

export function sliderToZoom(value: number): number {
  const t = value / 1000;
  return clampZoom(MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, t));
}

export function minimapLayout(
  state: Pick<
    ViewportState,
    | "contentWidth"
    | "contentHeight"
    | "zoom"
    | "panX"
    | "panY"
    | "viewWidth"
    | "viewHeight"
  >,
  width: number,
  height: number,
): MinimapLayout | null {
  const {
    contentWidth,
    contentHeight,
    zoom,
    panX,
    panY,
    viewWidth,
    viewHeight,
  } = state;
  if (
    contentWidth <= 0 ||
    contentHeight <= 0 ||
    zoom <= 0 ||
    width <= 0 ||
    height <= 0
  )
    return null;
  const scale = Math.min(width / contentWidth, height / contentHeight);
  const contentW = contentWidth * scale;
  const contentH = contentHeight * scale;
  const contentX = (width - contentW) / 2;
  const contentY = (height - contentH) / 2;
  return {
    scale,
    contentX,
    contentY,
    contentW,
    contentH,
    frameX: contentX + (-panX / zoom) * scale,
    frameY: contentY + (-panY / zoom) * scale,
    frameW: (viewWidth / zoom) * scale,
    frameH: (viewHeight / zoom) * scale,
  };
}

export function pointInFrame(
  layout: MinimapLayout,
  x: number,
  y: number,
): boolean {
  return (
    x >= layout.frameX &&
    y >= layout.frameY &&
    x <= layout.frameX + layout.frameW &&
    y <= layout.frameY + layout.frameH
  );
}

export function minimapToContent(
  layout: MinimapLayout,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: (x - layout.contentX) / layout.scale,
    y: (y - layout.contentY) / layout.scale,
  };
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function zoomAt(
  state: ViewportState,
  zoom: number,
  origin: ZoomOrigin,
): ViewportState {
  const nextZoom = clampZoom(zoom);
  if (nextZoom === state.zoom) return state;
  const ox = origin === "center" ? state.viewWidth / 2 : origin.x;
  const oy = origin === "center" ? state.viewHeight / 2 : origin.y;
  const ratio = nextZoom / state.zoom;
  return {
    ...state,
    zoom: nextZoom,
    panX: ox - (ox - state.panX) * ratio,
    panY: oy - (oy - state.panY) * ratio,
  };
}

function placeFitted(state: ViewportState): ViewportState {
  if (
    state.contentWidth <= 0 ||
    state.contentHeight <= 0 ||
    state.viewWidth <= 0 ||
    state.viewHeight <= 0
  ) {
    return state;
  }
  return placeInView(state, Number.POSITIVE_INFINITY);
}

function placeCentered(state: ViewportState): ViewportState {
  if (
    state.contentWidth <= 0 ||
    state.contentHeight <= 0 ||
    state.viewWidth <= 0 ||
    state.viewHeight <= 0
  ) {
    return state;
  }
  return placeInView(state, 1);
}

function placeInView(state: ViewportState, zoomCap: number): ViewportState {
  const tools = state.frames.tools;
  const navigatorFrame = state.frames.navigator;
  const reserveLeft = tools.custom ? 0 : tools.width + PANEL_MARGIN;
  const reserveRight = navigatorFrame.custom
    ? 0
    : navigatorFrame.width + PANEL_MARGIN;
  const availW = Math.max(
    1,
    state.viewWidth - reserveLeft - reserveRight - VIEW_MARGIN * 2,
  );
  const availH = Math.max(1, state.viewHeight - VIEW_MARGIN * 2);
  const zoom = clampZoom(
    Math.min(
      zoomCap,
      availW / state.contentWidth,
      availH / state.contentHeight,
    ),
  );
  const usedW = state.viewWidth - reserveLeft - reserveRight;
  const next = {
    ...state,
    zoom,
    panX: reserveLeft + (usedW - state.contentWidth * zoom) / 2,
    panY: (state.viewHeight - state.contentHeight * zoom) / 2,
  };
  if (
    next.zoom === state.zoom &&
    next.panX === state.panX &&
    next.panY === state.panY
  )
    return state;
  return next;
}

function resizeView(
  state: ViewportState,
  width: number,
  height: number,
): ViewportState {
  if (width === state.viewWidth && height === state.viewHeight) return state;
  const next = clampFrames({ ...state, viewWidth: width, viewHeight: height });
  if (next.fittedKey === next.contentKey) return next;
  return tryPlace(next);
}

function resizeContent(
  state: ViewportState,
  key: string,
  width: number,
  height: number,
  placement: ContentPlacement,
): ViewportState {
  const unchanged =
    state.contentKey === key &&
    state.contentWidth === width &&
    state.contentHeight === height &&
    state.placement === placement;
  if (
    unchanged &&
    (state.fittedKey === key ||
      width <= 0 ||
      height <= 0 ||
      state.viewWidth <= 0)
  ) {
    return state;
  }
  const next = {
    ...state,
    contentKey: key,
    contentWidth: width,
    contentHeight: height,
    placement,
  };
  if (state.fittedKey === key) return next;
  return tryPlace(next);
}

function tryPlace(state: ViewportState): ViewportState {
  if (
    state.viewWidth <= 0 ||
    state.viewHeight <= 0 ||
    state.contentWidth <= 0 ||
    state.contentHeight <= 0
  ) {
    return state;
  }
  const placed =
    state.placement === "fit" ? placeFitted(state) : placeCentered(state);
  if (placed === state) return { ...state, fittedKey: state.contentKey };
  return { ...placed, fittedKey: state.contentKey };
}

function writeFrame(
  state: ViewportState,
  id: WidgetId,
  patch: Partial<WidgetFrame>,
): ViewportState {
  return {
    ...state,
    frames: {
      ...state.frames,
      [id]: { ...state.frames[id], ...patch },
    },
  };
}

function rememberFrame(id: WidgetId, state: ViewportState): void {
  const frame = state.frames[id];
  saveWidgetPlacement(id, {
    x: frame.x,
    y: frame.y,
    custom: frame.custom,
  });
}

function hydratePlacement(): void {
  const saved = preferencesStore.get();
  if (WIDGET_IDS.every((id) => !saved[id].custom)) return;
  viewportStore.setState((state) => {
    let frames = state.frames;
    for (const id of WIDGET_IDS) {
      const placement = saved[id];
      if (!placement.custom) continue;
      frames = {
        ...frames,
        [id]: {
          ...frames[id],
          x: placement.x,
          y: placement.y,
          custom: true,
        },
      };
    }
    return { ...state, frames };
  });
}

hydratePlacement();

type WidgetDock = "top-start" | "top-end" | "bottom-start";

const WIDGET_DOCK: Record<WidgetId, WidgetDock> = {
  tools: "top-start",
  navigator: "top-end",
  layers: "bottom-start",
};

function dockedOrigin(
  state: ViewportState,
  id: WidgetId,
): { x: number; y: number } {
  const frame = state.frames[id];
  const maxX = Math.max(
    PANEL_MARGIN,
    state.viewWidth - frame.width - PANEL_MARGIN,
  );
  const maxY = Math.max(
    PANEL_MARGIN,
    state.viewHeight - frame.height - PANEL_MARGIN,
  );
  const dock = WIDGET_DOCK[id];
  return {
    x: dock === "top-end" ? maxX : PANEL_MARGIN,
    y: dock === "bottom-start" ? maxY : PANEL_MARGIN,
  };
}

function clampFrame(state: ViewportState, id: WidgetId): ViewportState {
  if (state.viewWidth <= 0 || state.viewHeight <= 0) return state;
  const frame = state.frames[id];
  const docked = dockedOrigin(state, id);
  const x = frame.custom ? frame.x : docked.x;
  const y = frame.custom ? frame.y : docked.y;
  const nextX = clamp(
    x,
    PANEL_MARGIN,
    Math.max(PANEL_MARGIN, state.viewWidth - frame.width - PANEL_MARGIN),
  );
  const nextY = clamp(
    y,
    PANEL_MARGIN,
    Math.max(PANEL_MARGIN, state.viewHeight - frame.height - PANEL_MARGIN),
  );
  if (nextX === frame.x && nextY === frame.y) return state;
  return writeFrame(state, id, { x: nextX, y: nextY });
}

function clampFrames(state: ViewportState): ViewportState {
  let next = state;
  for (const id of WIDGET_IDS) next = clampFrame(next, id);
  return next;
}
