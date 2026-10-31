import { useSelector, type UseSelectorOptions } from "@tanstack/react-store";
import { viewportContext } from "./viewport-context.ts";
import {
  viewportStore,
  type UserAction,
  type ViewportState,
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
