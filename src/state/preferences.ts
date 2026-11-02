import { Store } from "@tanstack/store";
import { z } from "zod";
import {
  appLocales,
  readNavigatorLanguages,
  resolveLocale,
} from "../i18n/locale.ts";

const STORAGE_KEY = "topo.preferences";
const WRITE_DELAY = 200;

/** Bump when the stored shape changes. Snapshots that fail this schema reset to defaults. */
export const PREFERENCES_SCHEMA_VERSION = 4;

const placementSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  custom: z.boolean(),
  /** Present after the user resizes the widget. Older snapshots omit both. */
  width: z.number().optional(),
  height: z.number().optional(),
});

export const preferencesSchema = z.strictObject({
  schemaVersion: z.literal(PREFERENCES_SCHEMA_VERSION),
  locale: z.enum(appLocales),
  navigator: placementSchema,
  tools: placementSchema,
  layers: placementSchema,
  marks: placementSchema,
  /** Which grade names the route list shows. The step on the route stays put. */
  gradeSystem: z.enum(["french", "yds"]),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type Placement = z.infer<typeof placementSchema>;

type LoadedPreferences = {
  preferences: Preferences;
  schemaReset: boolean;
};

function dockedPlacement(): Placement {
  return { x: 0, y: 0, custom: false };
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
  };
}

/**
 * Version 1 stored tools and the navigator. Layers joined in version 2.
 * The grade system joined in version 3. A snapshot that omits it keeps the
 * other fields and stores French. The marks palette joined in version 4 and
 * starts docked.
 * Width and height are optional on each placement; older snapshots omit them.
 */
function migrate(json: unknown): unknown {
  if (json == null || typeof json !== "object") return json;
  const value = json as Record<string, unknown>;
  if (value.schemaVersion === 1) {
    return {
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      locale: value.locale,
      navigator: value.navigator,
      tools: value.tools,
      layers: dockedPlacement(),
      marks: dockedPlacement(),
      gradeSystem: "french",
    };
  }
  if (
    value.schemaVersion === 2 ||
    value.schemaVersion === 3 ||
    value.gradeSystem == null
  ) {
    return {
      ...value,
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      marks: value.marks ?? dockedPlacement(),
      gradeSystem: value.gradeSystem === "yds" ? "yds" : "french",
    };
  }
  return json;
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
    stored.gradeSystem !== parsed.data.gradeSystem
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
      current.height === placement.height
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

export function setGradeSystem(system: Preferences["gradeSystem"]): void {
  preferencesStore.setState((state) =>
    state.gradeSystem === system ? state : { ...state, gradeSystem: system },
  );
  flushPreferences();
}
