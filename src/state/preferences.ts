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
export const PREFERENCES_SCHEMA_VERSION = 1;

const placementSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  custom: z.boolean(),
});

export const preferencesSchema = z.strictObject({
  schemaVersion: z.literal(PREFERENCES_SCHEMA_VERSION),
  locale: z.enum(appLocales),
  navigator: placementSchema,
  tools: placementSchema,
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
  const parsed = preferencesSchema.safeParse(json);
  if (!parsed.success) {
    writePreferences(fallback);
    return { preferences: fallback, schemaReset: true };
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
    if (writeTimer != null) window.clearTimeout(writeTimer);
  });
}

function savePlacement(key: "navigator" | "tools", placement: Placement): void {
  preferencesStore.setState((state) => {
    const current = state[key];
    if (
      current.x === placement.x &&
      current.y === placement.y &&
      current.custom === placement.custom
    ) {
      return state;
    }
    return { ...state, [key]: placement };
  });
}

export function saveNavigator(placement: Placement): void {
  savePlacement("navigator", placement);
}

export function saveTools(placement: Placement): void {
  savePlacement("tools", placement);
}
