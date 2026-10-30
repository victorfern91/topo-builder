# Topo

Topo is an Illustrator-style image editor that runs in the browser. This first slice is the application bar: open an image file and place it on the artboard.

The workspace is dark. Nothing is on the board until you open a file. While the app or the artboard view is loading, the page shows skeleton placeholders. If a file cannot be decoded, the board says so.

## Run locally

Install [Bun](https://bun.sh). Package scripts run on Bun, so this repo does not need a selected Node.js version.

```sh
bun install
bun run dev
```

The dev server binds `0.0.0.0:24680`. Open [http://127.0.0.1:24680/](http://127.0.0.1:24680/).

```sh
bun run build
```

The production build is written to `dist/`.

Use **File → Open…** or the **Open** button, or press Ctrl+O (Command+O on macOS). Accepted files are PNG, JPEG, GIF, WebP, AVIF, BMP, and SVG. Labels follow the browser language: Portuguese (Portugal) or English (United States).

## Stack

- Bun, Vite, React, and TypeScript
- [Base UI](https://base-ui.com/) (`@base-ui/react`) for the File menu and buttons
- TanStack Store (`@tanstack/store`, `@tanstack/react-store`) for the open document
- TanStack Router (`@tanstack/react-router`) for the workspace route; the artboard view is lazy-loaded
- [StyleX](https://stylexjs.com/) for the workspace styles

## GitHub Pages

`.github/workflows/pages.yml` builds the app and deploys `dist/` when commits land on `main`. The site is published at `https://victorfern91.github.io/topo-builder/`.

The workflow cannot turn Pages on by itself. Once, in the repository on GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

If the deploy job is refused because the token cannot write, set **Settings → Actions → General → Workflow permissions** to **Read and write permissions**, then rerun the workflow.
