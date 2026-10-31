import react from "@vitejs/plugin-react";
import { unplugin as stylex } from "@stylexjs/unplugin";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig } from "vite";

// Project Pages site: https://victorfern91.github.io/topo-builder/
// Local dev leaves this unset and serves from /.
const base = normalizeBase(process.env.VITE_BASE_PATH);
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const buttonEntry = fileURLToPath(
  new URL("./packages/ui/components/src/button/index.ts", import.meta.url),
);
const layoutEntry = fileURLToPath(
  new URL("./packages/ui/components/src/layout/index.ts", import.meta.url),
);
const sliderEntry = fileURLToPath(
  new URL("./packages/ui/components/src/slider/index.ts", import.meta.url),
);
const widgetEntry = fileURLToPath(
  new URL("./packages/ui/components/src/widget/index.ts", import.meta.url),
);
const tokensEntry = fileURLToPath(
  new URL("./packages/ui/components/src/tokens.stylex.ts", import.meta.url),
);
const uiEntry = fileURLToPath(
  new URL("./packages/ui/components/src/index.ts", import.meta.url),
);

export default defineConfig({
  base,
  resolve: {
    alias: [
      { find: /^@ui\/tokens$/, replacement: tokensEntry },
      { find: /^@ui\/button$/, replacement: buttonEntry },
      { find: /^@ui\/layout$/, replacement: layoutEntry },
      { find: /^@ui\/slider$/, replacement: sliderEntry },
      { find: /^@ui\/widget$/, replacement: widgetEntry },
      { find: /^@ui$/, replacement: uiEntry },
    ],
  },
  optimizeDeps: {
    exclude: ["@ui"],
  },
  plugins: [
    stylex.vite({
      useCSSLayers: { before: ["base"] },
      unstable_moduleResolution: {
        type: "custom",
        // StyleX follows an import when its path ends with this extension.
        // Empty matches `@ui` and `@ui/tokens`, which resolve to the token file.
        themeFileExtension: "",
        filePathResolver: stylexTokenPath,
        getCanonicalFilePath: stylexCanonicalPath,
      },
    }),
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 24680,
    strictPort: true,
  },
});

function stylexTokenPath(
  importPath: string,
  sourceFilePath: string,
): string | undefined {
  if (importPath === "@ui" || importPath === "@ui/tokens") return tokensEntry;
  if (importPath.includes(".stylex.")) {
    return fileURLToPath(new URL(importPath, pathToFileURL(sourceFilePath)));
  }
  return undefined;
}

function stylexCanonicalPath(filePath: string): string {
  return path.relative(rootDir, path.resolve(filePath));
}

function normalizeBase(value: string | undefined): string {
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}
