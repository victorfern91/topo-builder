import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { WorkspaceSkeleton } from "./components/workspace-skeleton.tsx";
import { RootLayout } from "./routes/root-layout.tsx";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  pendingComponent: WorkspaceSkeleton,
  pendingMs: 0,
  pendingMinMs: 0,
  component: lazyRouteComponent(() => import("./routes/artboard-page.tsx")),
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
  basepath: routerBasepath(),
  defaultPendingComponent: WorkspaceSkeleton,
  defaultPendingMs: 0,
  defaultPendingMinMs: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function routerBasepath(): string {
  const raw = import.meta.env.BASE_URL;
  if (raw === "/") return "/";
  return raw.replace(/\/$/, "");
}
