import { createStoreContext } from "@tanstack/react-store";
import type { ViewportContextValue } from "./viewport.ts";

export const viewportContext = createStoreContext<ViewportContextValue>();
