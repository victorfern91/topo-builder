import { useSelector, type UseSelectorOptions } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import { useCallback } from "react";
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

/** Position, drag flags, and move/drop handlers for one floating widget. */
export function useWidgetFrame(id: WidgetId) {
  const { actions, getState } = useViewport();
  const frame = useViewportSelector(
    (state) => ({
      x: state.frames[id].x,
      y: state.frames[id].y,
      placed: state.viewWidth > 0,
      dragging: state.userAction === id,
    }),
    { compare: shallow },
  );
  const onResize = useCallback(
    (width: number, height: number) => {
      actions.resizeFrame(id, width, height);
    },
    [actions, id],
  );
  const onDragStart = useCallback(() => {
    actions.setUserAction(id);
  }, [actions, id]);
  const onMove = useCallback(
    (x: number, y: number) => {
      actions.moveFrame(id, x, y);
    },
    [actions, id],
  );
  const onDragEnd = useCallback(
    (moved: boolean) => {
      if (moved) actions.dropFrame(id);
      if (getState().userAction === id) actions.setUserAction("idle");
    },
    [actions, getState, id],
  );
  return { ...frame, onResize, onDragStart, onMove, onDragEnd };
}
