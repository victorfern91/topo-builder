import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./state/preferences.ts";
import { applyDocumentLocale } from "./i18n/index.ts";
import { router } from "./router.tsx";
import "./index.css";

applyDocumentLocale();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Topo could not find its root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
