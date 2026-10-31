# UI

Import interactive controls from `@ui` (`import { Button, Layout } from '@ui'`, `import Button from '@ui/button'`, or `import Layout from '@ui/layout'`). The package exports are the components available to the app. Compose the parts those exports provide; for Button that is `Button.Root`, `Button.Icon`, and `Button.Text`. For boxes that is `Layout.Box`, `Layout.Stack`, and `Layout.Grid`. Each takes `renderAs` `div` (default) or `span`. Prop and composition details live on the JSDoc of each part.

Ship Button defaults. Pass `variant`, `size`, `radius`, `rounded`, or `sx` only for instance-specific layout or state.

Ship Layout defaults. `Layout.Box` keeps the element display. `Layout.Stack` is a column flex container and `Layout.Grid` is a grid container. Pass `renderAs`, `display`, `direction`, `wrap`, `gap`, `align`, `justify`, `grow`, `shrink`, `basis`, `p`, `px`, `py`, `m`, `mx`, `my`, `columns`, `rows`, or `sx` only for instance-specific layout. `p`/`m` set every side. `px`/`mx` set the inline axis and `py`/`my` set the block axis.

`@base-ui/react` stays inside `packages/ui/components`. App code under `src/` does not import it.

A control that is not exported from `@ui` gets a wrapper in `packages/ui/components` first. Export it from that package, then use the export.

# Tokens

Import design tokens with the components: `import { Tokens } from '@ui'`. `import Tokens from '@ui/tokens'` is the same object.

Read `Tokens.size.md`, `Tokens.spacing.md`, `Tokens.color.neutral[100]`, `Tokens.color.blue[500]`, and `Tokens.media.narrow`. Shade steps run from light to dark. `white` and `black` steps are opacity percent.

Inside `stylex.create`, use the named import.

# Format

`bun fmt`
