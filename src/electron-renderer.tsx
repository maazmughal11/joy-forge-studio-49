/**
 * Desktop (Electron) renderer entry point.
 *
 * The web build keeps using TanStack Start / SSR untouched. The desktop build
 * mounts exactly the same route tree as a client-only SPA so it can be loaded
 * from `file://` inside Electron with no server and no network dependency.
 *
 * Hash history is used because `file://` URLs have no path-based routing.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createRouter, createHashHistory } from "@tanstack/react-router";

import "./styles.css";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
