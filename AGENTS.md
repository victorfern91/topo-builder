# UI

Import interactive controls from `@ui` (`import { Button, Layout, Slider, Widget } from '@ui'`, `import Button from '@ui/button'`, `import Layout from '@ui/layout'`, `import Slider from '@ui/slider'`, or `import Widget from '@ui/widget'`). The package exports are the components available to the app. Compose the parts those exports provide; for Button that is `Button.Root`, `Button.Icon`, and `Button.Text`. For boxes that is `Layout.Box`, `Layout.Stack`, and `Layout.Grid`. For a slider that is `Slider.Root`, `Slider.Label`, `Slider.Control`, `Slider.Track`, `Slider.Indicator`, `Slider.Thumb`, and `Slider.Value`. For a floating panel that is `Widget.Panel`, `Widget.Header`, `Widget.Container`, and `Widget.Menu`. Each of Button and Layout takes `renderAs` `div` (default) or `span`. `Widget.Panel` takes `renderAs` `div` (default), `aside`, or `section`. Prop and composition details live on the JSDoc of each part.

Ship Button defaults. Pass `variant`, `size`, `radius`, `rounded`, or `sx` only for instance-specific layout or state.

Ship Layout defaults. `Layout.Box` keeps the element display. `Layout.Stack` is a column flex container and `Layout.Grid` is a grid container. Pass `renderAs`, `display`, `direction`, `wrap`, `gap`, `align`, `justify`, `grow`, `shrink`, `basis`, `p`, `px`, `py`, `m`, `mx`, `my`, `columns`, `rows`, or `sx` only for instance-specific layout. `p`/`m` set every side. `px`/`mx` set the inline axis and `py`/`my` set the block axis.

`@base-ui/react` stays inside `packages/ui/components`. App code under `src/` does not import it.

A control that is not exported from `@ui` gets a wrapper in `packages/ui/components` first. Export it from that package, then use the export.

# Slider

Ship Slider defaults. Pass `sx` for instance width or flex.

```tsx
<Slider.Root min={0} max={100} value={value} onValueChange={setValue}>
  <Slider.Label>Scale</Slider.Label>
  <Slider.Control>
    <Slider.Track>
      <Slider.Indicator />
      <Slider.Thumb aria-valuetext="100%" />
    </Slider.Track>
  </Slider.Control>
  <Slider.Value>{() => "100%"}</Slider.Value>
</Slider.Root>
```

`Label` and `Value` are optional. `Thumb` `aria-label` names the slider when there is no `Label`. `aria-valuetext` is the spoken value. `onValueChange` receives the next value while dragging and from the keyboard.

# Widget

Ship Widget defaults. Pass `sx` for instance chrome such as width, z-index, or overflow.

```tsx
<Widget.Panel x={x} y={y} onMove={move} onResize={resize} resizable>
  <Widget.Header label="Drag to move">Title</Widget.Header>
  <Widget.Container>{children}</Widget.Container>
</Widget.Panel>
```

`x` and `y` are the panel origin in pixels. `onMove` receives the next origin from a pointer drag or an arrow-key nudge (8 pixels, 24 with Shift). `onDragStart` runs once the pointer passes the movement threshold. `onDragEnd` receives `moved`: false means the header was clicked. `placed` hides the panel until the stage has a size. `dragging` sets `data-dragging` on the panel and the header.

`Widget.Header` is the drag handle. `label` is its accessible name. Children are the title. Omit children for a grip bar. The title row and the grip bar show the same grip.

`Widget.Panel` stays at its layout size. Pass `resizable` to resize from the right edge, the bottom edge, and the corner. `onResize` reports the border box, in pixels, after layout and during that resize. `minWidth` and `minHeight` default to 48. `resizeLabel` names the corner handle. Arrow keys on that handle resize; Shift uses the larger step.

`Widget.Container` is the column body. Pass Layout stack props for that instance.

`Widget.Menu` is the popup chrome. Position it with `sx` or `style`. It stays at its content size. Pass `resizable` to resize from the right edge, the bottom edge, and the corner; `onResize`, `minWidth`, `minHeight`, and `resizeLabel` match the panel. The menu stops at the viewport edge.

# Tokens

Import design tokens with the components: `import { Tokens } from '@ui'`. `import Tokens from '@ui/tokens'` is the same object.

Read `Tokens.size.md`, `Tokens.spacing.md`, `Tokens.color.neutral[100]`, `Tokens.color.blue[500]`, and `Tokens.media.narrow`. Shade steps run from light to dark. `white` and `black` steps are opacity percent.

Inside `stylex.create`, use the named import.

# Format

`bun fmt`

# Shell

Prefix shell commands with `rtk` so output stays small. Unfiltered output: `rtk proxy <cmd>`. Command map: @RTK.md
