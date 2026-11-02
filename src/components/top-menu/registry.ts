import { Store } from "@tanstack/store";
import type { ComponentType } from "react";
import type { Toast } from "@ui";
import { errorMessage, t } from "../../i18n/index.ts";
import { errorCode } from "../../state/errors.ts";
import {
  exportName,
  exportTopo,
  type ExportFormat,
} from "../../state/export-image.ts";
import { historyStore, redo, undo } from "../../state/history.ts";
import {
  imageDocumentStore,
  requestImageFilePicker,
} from "../../state/image-document.ts";
import { preferencesStore, setGradeSystem } from "../../state/preferences.ts";
import { ScaleSlider } from "../scale-slider.tsx";

/** Anything `useSelector` can read. */
export type Source<T> = {
  get: () => T;
  subscribe: (listener: (value: T) => void) => { unsubscribe: () => void };
};

export type MenuActionContext = {
  toasts: ReturnType<typeof Toast.useToastManager>;
};

/** `V` is the entry `value` type. `undefined` means the action takes no value. */
export type MenuAction<V = undefined> = {
  run: (value: V, context: MenuActionContext) => void;
};

/** `V` is the option `value` type. */
export type MenuBinding<V extends string> = {
  source: Source<V>;
  set: (value: V) => void;
};

function action(run: (context: MenuActionContext) => void): MenuAction {
  return { run: (_value, context) => run(context) };
}

/** `select` must return a primitive so the snapshot stays stable between reads. */
function derive<T, V>(source: Source<T>, select: (state: T) => V): Source<V> {
  return {
    get: () => select(source.get()),
    subscribe: (listener) =>
      source.subscribe(() => listener(select(source.get()))),
  };
}

function when<T>(
  source: Source<T>,
  select: (state: T) => boolean,
): Source<boolean> {
  return derive(source, select);
}

function binding<T, V extends string>(
  source: Source<T>,
  select: (state: T) => V,
  set: (value: V) => void,
): MenuBinding<V> {
  return { source: derive(source, select), set };
}

export const exportingStore = new Store<ExportFormat | null>(null);

async function runExport(
  format: ExportFormat,
  { toasts }: MenuActionContext,
): Promise<void> {
  const fileName = exportName(
    imageDocumentStore.get().fileName ?? "topo",
    format,
  );
  exportingStore.setState(() => format);
  try {
    await exportTopo(format);
  } catch (error) {
    const code = errorCode(error, "EXPORT_FAILED");
    toasts.add({
      title: t("exportFailedTitle"),
      description: `${errorMessage(code, { fileName })} ${t("errorCodeLabel", { code })}`,
      type: "warning",
    });
  } finally {
    exportingStore.setState(() => null);
  }
}

/** Commands an entry names with `action`. */
export const menuActions = {
  openImage: action(() => requestImageFilePicker()),
  undo: action(() => undo()),
  redo: action(() => redo()),
  export: {
    run: (format: ExportFormat, context) => {
      void runExport(format, context);
    },
  },
} satisfies Record<string, MenuAction<never>>;

/** Flags an entry names with `enabledWhen`, `visibleWhen`, or `busy.when`. */
export const menuConditions = {
  documentReady: when(imageDocumentStore, (state) => state.status === "ready"),
  canUndo: when(historyStore, (state) => state.canUndo),
  canRedo: when(historyStore, (state) => state.canRedo),
  exporting: when(exportingStore, (state) => state !== null),
} satisfies Record<string, Source<boolean>>;

/** Values a `radio` entry reads and writes with `binding`. */
export const menuBindings = {
  gradeSystem: binding(
    preferencesStore,
    (state) => state.gradeSystem,
    setGradeSystem,
  ),
} satisfies Record<
  string,
  { source: Source<string>; set: (value: never) => void }
>;

/** Components a `widget` entry places with `widget`. */
export const menuWidgets = {
  scaleSlider: ScaleSlider,
} satisfies Record<string, ComponentType>;

export type MenuActionId = keyof typeof menuActions;
export type MenuConditionId = keyof typeof menuConditions;
export type MenuBindingId = keyof typeof menuBindings;
export type MenuWidgetId = keyof typeof menuWidgets;

export type MenuActionValue<A extends MenuActionId> = Parameters<
  (typeof menuActions)[A]["run"]
>[0];
export type MenuBindingValue<B extends MenuBindingId> = ReturnType<
  (typeof menuBindings)[B]["source"]["get"]
>;

/** Runs the entry's action with its value. */
export function runMenuAction<A extends MenuActionId>(
  entry: { action: A; value?: MenuActionValue<A> },
  context: MenuActionContext,
): void {
  const run = menuActions[entry.action].run as MenuAction<
    MenuActionValue<A> | undefined
  >["run"];
  run(entry.value, context);
}
