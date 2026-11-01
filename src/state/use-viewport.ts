import { useSelector, type UseSelectorOptions } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
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
  const onResize = (width: number, height: number) => {
    actions.resizeFrame(id, width, height);
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
