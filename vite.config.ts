import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { unplugin as stylex } from "@stylexjs/unplugin";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig, type Plugin } from "vite";

// Project Pages site: https://victorfern91.github.io/topo-builder/
// Local dev leaves this unset and serves from /.
const base = normalizeBase(process.env.VITE_BASE_PATH);
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const reactIconsRoot = path.dirname(
  createRequire(
    fileURLToPath(
      new URL("./packages/ui/components/package.json", import.meta.url),
    ),
  ).resolve("react-icons/package.json"),
);
const tablerEntry = path.join(reactIconsRoot, "tb/index.mjs");
const iconBaseEntry = path.join(reactIconsRoot, "lib/iconBase.mjs");
const buttonEntry = fileURLToPath(
  new URL("./packages/ui/components/src/button/index.ts", import.meta.url),
);
const inputEntry = fileURLToPath(
  new URL("./packages/ui/components/src/input/index.ts", import.meta.url),
);
const layoutEntry = fileURLToPath(
  new URL("./packages/ui/components/src/layout/index.ts", import.meta.url),
);
const sliderEntry = fileURLToPath(
  new URL("./packages/ui/components/src/slider/index.ts", import.meta.url),
);
const tableEntry = fileURLToPath(
  new URL("./packages/ui/components/src/table/index.ts", import.meta.url),
);
const toastEntry = fileURLToPath(
  new URL("./packages/ui/components/src/toast/index.ts", import.meta.url),
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
      { find: /^@ui\/input$/, replacement: inputEntry },
      { find: /^@ui\/layout$/, replacement: layoutEntry },
      { find: /^@ui\/slider$/, replacement: sliderEntry },
      { find: /^@ui\/table$/, replacement: tableEntry },
      { find: /^@ui\/toast$/, replacement: toastEntry },
      { find: /^@ui\/widget$/, replacement: widgetEntry },
      { find: /^@ui$/, replacement: uiEntry },
    ],
  },
  optimizeDeps: {
    exclude: ["@ui", "react-icons/tb"],
  },
  plugins: [
    tablerIcons(tablerEntry, iconBaseEntry),
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
    babel({ presets: [reactCompilerPreset()] }),
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

const TABLER_VIRTUAL = "virtual:react-icons/tb/";
const TABLER_IMPORT =
  /import\s*\{([\s\S]*?)\}\s*from\s*["']react-icons\/tb["'];?/g;

// `react-icons/tb` is one module of every Tabler icon. Vite's dep
// prebundle keeps every export of that entry. Split each named import
// into its own module so dev and production only ship the icons we use.
function tablerIcons(tbFile: string, iconBaseFile: string): Plugin {
  let source: string | undefined;
  const readSource = () => (source ??= fs.readFileSync(tbFile, "utf8"));
  const iconBaseImport = JSON.stringify(iconBaseFile);

  return {
    name: "tabler-icons",
    enforce: "pre",
    resolveId(id) {
      if (!id.startsWith(TABLER_VIRTUAL)) return null;
      const name = id.slice(TABLER_VIRTUAL.length);
      if (!/^Tb[A-Za-z0-9]+$/.test(name)) return null;
      return `\0${id}`;
    },
    load(id) {
      const prefix = `\0${TABLER_VIRTUAL}`;
      if (!id.startsWith(prefix)) return null;
      const name = id.slice(prefix.length);
      const marker = `export function ${name} `;
      const start = readSource().indexOf(marker);
      if (start < 0) {
        this.error(`Unknown Tabler icon ${name}`);
        return null;
      }
      const next = readSource().indexOf(
        "\nexport function ",
        start + marker.length,
      );
      const body = readSource()
        .slice(start, next === -1 ? undefined : next)
        .trimEnd();
      return `import { GenIcon } from ${iconBaseImport};\n${body}\n`;
    },
    transform(code, id) {
      if (id.includes("node_modules") || !code.includes("react-icons/tb")) {
        return null;
      }
      let changed = false;
      const next = code.replace(TABLER_IMPORT, (_full, block: string) => {
        changed = true;
        return specifiers(block)
          .map(({ imported, local }) => {
            const binding =
              imported === local ? imported : `${imported} as ${local}`;
            return `import { ${binding} } from "${TABLER_VIRTUAL}${imported}";`;
          })
          .join("\n");
      });
      return changed ? next : null;
    },
  };
}

function specifiers(block: string): { imported: string; local: string }[] {
  return block
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [imported, local] = part.split(/\s+as\s+/);
      return {
        imported: imported.trim(),
        local: (local ?? imported).trim(),
      };
    });
}
