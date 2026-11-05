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

Use **File → Open…** or the **Open** button, or press Ctrl+O (Command+O on macOS). Accepted files are PNG, JPEG, GIF, WebP, AVIF, BMP, TIFF, and SVG. Labels follow the browser language: Portuguese (Portugal) or English (United States).

## Stack

- Bun, Vite, React, and TypeScript
- [Base UI](https://base-ui.com/) (`@base-ui/react`) for the File menu and buttons
- TanStack Store (`@tanstack/store`, `@tanstack/react-store`) for the open document
- TanStack Router (`@tanstack/react-router`) for the workspace route; the artboard view is lazy-loaded
- [StyleX](https://stylexjs.com/) for the workspace styles

## GitHub Pages

`.github/workflows/pages.yml` builds the app and publishes `dist/` to the `gh-pages` branch when a commit on `main` changes the app. The site is at `https://victorfern91.github.io/topo-builder/`. A manual run builds even when the app is unchanged.

`.github/workflows/preview.yml` publishes a pull request that changes the app to `https://victorfern91.github.io/topo-builder/pr-preview/pr-<number>/` and comments that URL on the pull request. A later commit that leaves the app alone keeps the existing preview. Merging or closing the pull request deletes the preview and the comment. A pull request opened from a fork does not get a preview.

The workflows cannot turn Pages on by themselves. Once, in the repository on GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set the branch to **gh-pages** and the folder to **/ (root)**. The `gh-pages` branch appears after the first successful run on `main`.

Until that source is the `gh-pages` branch, new commits and pull request previews are not what the site serves. The previous Actions deployment keeps serving the last build.

If a job is refused because the token cannot write, set **Settings → Actions → General → Workflow permissions** to **Read and write permissions**, then rerun the workflow.

## Commits

`bun run commit` prompts for a [Conventional Commit](https://www.conventionalcommits.org/). A pull request title uses that same line. Set the repository squash merge commit to the pull request title, because that commit is what lands on `main`.

`feat` publishes a minor version, `fix` and `perf` publish a patch, and `type!:` or a `BREAKING CHANGE` footer publishes a major. Any other type leaves the version. The release workflow tags that version, updates `package.json` and `CHANGELOG.md`, and opens a GitHub release. No version tag exists yet, so the first release that includes a `feat` commit is `1.0.0`.
