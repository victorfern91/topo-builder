import { Store } from "@tanstack/store";
import { z } from "zod";
import { BOULDER_GRADE_SYSTEMS, GRADE_SYSTEMS, type GradeSystems } from "./grade.ts";
import {
  appLocales,
  readNavigatorLanguages,
  resolveLocale,
} from "../i18n/locale.ts";

const STORAGE_KEY = "topo.preferences";
const WRITE_DELAY = 200;

/** Bump when the stored shape changes. Snapshots that fail this schema reset to defaults. */
export const PREFERENCES_SCHEMA_VERSION = 6;

const placementSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  custom: z.boolean(),
  /** Present after the user resizes the widget. Older snapshots omit both. */
  width: z.number().optional(),
  height: z.number().optional(),
  /** False hides the widget until the View menu shows it again. */
  open: z.boolean(),
  /** True keeps the header and collapses the body. */
  minimized: z.boolean(),
});

export const preferencesSchema = z.strictObject({
  schemaVersion: z.literal(PREFERENCES_SCHEMA_VERSION),
  locale: z.enum(appLocales),
  navigator: placementSchema,
  tools: placementSchema,
  layers: placementSchema,
  marks: placementSchema,
  /** Which grade names the route list shows. The step on the route stays put. */
  gradeSystem: z.enum(GRADE_SYSTEMS),
  /** Which grade names the boulder list shows. The step on the boulder stays put. */
  boulderGradeSystem: z.enum(BOULDER_GRADE_SYSTEMS),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type Placement = z.infer<typeof placementSchema>;

type LoadedPreferences = {
  preferences: Preferences;
  schemaReset: boolean;
};

function dockedPlacement(): Placement {
  return { x: 0, y: 0, custom: false, open: true, minimized: false };
}

function withChrome(value: unknown): Placement {
  if (value == null || typeof value !== "object") return dockedPlacement();
  const placement = value as Record<string, unknown>;
  return {
    x: typeof placement.x === "number" ? placement.x : 0,
    y: typeof placement.y === "number" ? placement.y : 0,
    custom: placement.custom === true,
    ...(typeof placement.width === "number"
      ? { width: placement.width }
      : null),
    ...(typeof placement.height === "number"
      ? { height: placement.height }
      : null),
    open: placement.open !== false,
    minimized: placement.minimized === true,
  };
}

function defaultPreferences(): Preferences {
  return {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    locale: resolveLocale(readNavigatorLanguages()),
    navigator: dockedPlacement(),
    tools: dockedPlacement(),
    layers: dockedPlacement(),
    marks: dockedPlacement(),
    gradeSystem: "french",
    boulderGradeSystem: "font",
  };
}

/**
 * Version 1 stored tools and the navigator. Layers joined in version 2.
 * The grade system joined in version 3. A snapshot that omits it keeps the
 * other fields and stores French. The marks palette joined in version 4 and
 * starts docked. Open and minimized joined in version 5; older snapshots stay
 * open and expanded. The boulder grade system joined in version 6; older
 * snapshots keep the other fields and store Font.
 * Width and height are optional on each placement; older snapshots omit them.
 */
function migrate(json: unknown): unknown {
  if (json == null || typeof json !== "object") return json;
  const value = json as Record<string, unknown>;
  if (value.schemaVersion === PREFERENCES_SCHEMA_VERSION) return json;
  if (value.schemaVersion === 1) {
    return {
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      locale: value.locale,
      navigator: withChrome(value.navigator),
      tools: withChrome(value.tools),
      layers: dockedPlacement(),
      marks: dockedPlacement(),
      gradeSystem: "french",
      boulderGradeSystem: "font",
    };
  }
  return {
    ...value,
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    navigator: withChrome(value.navigator),
    tools: withChrome(value.tools),
    layers: withChrome(value.layers ?? dockedPlacement()),
    marks: withChrome(value.marks ?? dockedPlacement()),
    gradeSystem: value.gradeSystem === "yds" ? "yds" : "french",
    boulderGradeSystem: value.boulderGradeSystem === "v" ? "v" : "font",
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePreferences(value: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be disabled or full. The in-memory store still works for this session.
  }
}

function loadPreferences(): LoadedPreferences {
  const fallback = defaultPreferences();
  const raw = readRaw();
  if (raw == null) {
    writePreferences(fallback);
    return { preferences: fallback, schemaReset: false };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    writePreferences(fallback);
    return { preferences: fallback, schemaReset: true };
  }
  const migrated = migrate(json);
  const parsed = preferencesSchema.safeParse(migrated);
  if (!parsed.success) {
    writePreferences(fallback);
    return { preferences: fallback, schemaReset: true };
  }
  const stored = json as Record<string, unknown>;
  if (
    stored.schemaVersion !== parsed.data.schemaVersion ||
    stored.gradeSystem !== parsed.data.gradeSystem ||
    stored.boulderGradeSystem !== parsed.data.boulderGradeSystem
  ) {
    writePreferences(parsed.data);
  }
  return { preferences: parsed.data, schemaReset: false };
}

const loaded = loadPreferences();

export const preferencesStore = new Store<Preferences>(loaded.preferences);

export const preferencesSchemaReset = loaded.schemaReset;

let writeTimer: number | null = null;

function scheduleWrite(): void {
  if (writeTimer != null) window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    writePreferences(preferencesStore.get());
  }, WRITE_DELAY);
}

export function flushPreferences(): void {
  if (writeTimer != null) {
    window.clearTimeout(writeTimer);
    writeTimer = null;
  }
  writePreferences(preferencesStore.get());
}

preferencesStore.subscribe(() => {
  scheduleWrite();
});

function onPageHide(): void {
  flushPreferences();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") flushPreferences();
}

window.addEventListener("pagehide", onPageHide);
document.addEventListener("visibilitychange", onVisibilityChange);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    flushPreferences();
  });
}

export type WidgetPreferenceId = "navigator" | "tools" | "layers" | "marks";

function savePlacement(key: WidgetPreferenceId, placement: Placement): void {
  preferencesStore.setState((state) => {
    const current = state[key];
    if (
      current.x === placement.x &&
      current.y === placement.y &&
      current.custom === placement.custom &&
      current.width === placement.width &&
      current.height === placement.height &&
      current.open === placement.open &&
      current.minimized === placement.minimized
    ) {
      return state;
    }
    return { ...state, [key]: placement };
  });
}

export function saveWidgetPlacement(
  id: WidgetPreferenceId,
  placement: Placement,
): void {
  savePlacement(id, placement);
}

export function setWidgetOpen(id: WidgetPreferenceId, open: boolean): void {
  preferencesStore.setState((state) => {
    const current = state[id];
    if (current.open === open && (!open || !current.minimized)) return state;
    return {
      ...state,
      [id]: {
        ...current,
        open,
        minimized: open ? false : current.minimized,
      },
    };
  });
  flushPreferences();
}

export function setWidgetMinimized(
  id: WidgetPreferenceId,
  minimized: boolean,
): void {
  preferencesStore.setState((state) => {
    const current = state[id];
    if (!current.open || current.minimized === minimized) return state;
    return { ...state, [id]: { ...current, minimized } };
  });
  flushPreferences();
}

export function setGradeSystem(system: Preferences["gradeSystem"]): void {
  preferencesStore.setState((state) =>
    state.gradeSystem === system ? state : { ...state, gradeSystem: system },
  );
  flushPreferences();
}

export function setBoulderGradeSystem(
  system: Preferences["boulderGradeSystem"],
): void {
  preferencesStore.setState((state) =>
    state.boulderGradeSystem === system
      ? state
      : { ...state, boulderGradeSystem: system },
  );
  flushPreferences();
}

/** Route and boulder grade systems. Select with `{ compare: shallow }`. */
export function gradeSystems(state: Preferences): GradeSystems {
  return { route: state.gradeSystem, boulder: state.boulderGradeSystem };
}
