import { useSelector, type UseSelectorOptions } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import {
  preferencesStore,
  setWidgetMinimized,
  setWidgetOpen,
} from "./preferences.ts";
import { viewportContext } from "./viewport-context.ts";
import {
  viewportStore,
  type UserAction,
  type ViewportState,
  type WidgetId,
} from "./viewport.ts";

export function useViewport() {
  return viewportContext.useStoreContext();
}

export function useViewportSelector<T>(
  selector: (state: ViewportState) => T,
  options?: UseSelectorOptions<T>,
): T {
  useViewport();
  return useSelector(viewportStore, selector, options);
}

export function useUserAction(): UserAction {
  return useViewportSelector((state) => state.userAction);
}

/** Position, size, drag flags, and move/resize/drop handlers for one floating widget. */
export function useWidgetFrame(id: WidgetId) {
  const { actions, getState } = useViewport();
  const frame = useViewportSelector(
    (state) => {
      const item = state.frames[id];
      return {
        x: item.x,
        y: item.y,
        width: item.resized ? item.width : undefined,
        height: item.resized ? item.height : undefined,
        placed: state.viewWidth > 0,
        dragging: state.userAction === id,
      };
    },
    { compare: shallow },
  );
  const onResize = (
    width: number,
    height: number,
    source?: "layout" | "user",
  ) => {
    actions.resizeFrame(id, width, height, source ?? "layout");
  };
  const onDragStart = () => {
    actions.setUserAction(id);
  };
  const onMove = (x: number, y: number) => {
    actions.moveFrame(id, x, y);
  };
  const onDragEnd = (moved: boolean) => {
    if (moved) actions.dropFrame(id);
    if (getState().userAction === id) actions.setUserAction("idle");
  };
  return { ...frame, onResize, onDragStart, onMove, onDragEnd };
}

/** Open and minimized flags plus close/minimize handlers for one floating widget. */
export function useWidgetChrome(id: WidgetId) {
  const chrome = useSelector(
    preferencesStore,
    (state) => ({
      open: state[id].open,
      minimized: state[id].minimized,
    }),
    { compare: shallow },
  );
  return {
    ...chrome,
    onClose: () => setWidgetOpen(id, false),
    onMinimize: () => setWidgetMinimized(id, !chrome.minimized),
  };
}
