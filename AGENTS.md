# UI

Import interactive controls from `@ui` (`import { Button } from '@ui'` or `import Button from '@ui/button'`). The package exports are the components available to the app. Compose the parts those exports provide; for Button that is `Button.Root`, `Button.Icon`, and `Button.Text`. Prop and composition details live on the JSDoc of each part.

Ship Button defaults. Pass `variant`, `size`, `radius`, `rounded`, or `sx` only for instance-specific layout or state.

`@base-ui/react` stays inside `packages/ui/components`. App code under `src/` does not import it.

A control that is not exported from `@ui` gets a wrapper in `packages/ui/components` first. Export it from that package, then use the export.

# Tokens

Import design tokens with the components: `import { Tokens } from '@ui'`. `import Tokens from '@ui/tokens'` is the same object.

Read `Tokens.size.md`, `Tokens.spacing.md`, `Tokens.color.neutral[100]`, `Tokens.color.blue[500]`, and `Tokens.media.narrow`. Shade steps run from light to dark. `white` and `black` steps are opacity percent.

Inside `stylex.create`, use the named import.

# Format

`bun fmt`
