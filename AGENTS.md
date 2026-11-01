# UI

Import interactive controls from `@ui` (`import { Button, Input, Layout, Slider, Table, Toast, Widget } from '@ui'`, `import Button from '@ui/button'`, `import Input from '@ui/input'`, `import Layout from '@ui/layout'`, `import Slider from '@ui/slider'`, `import Table from '@ui/table'`, `import Toast from '@ui/toast'`, or `import Widget from '@ui/widget'`). The package exports are the components available to the app. Compose the parts those exports provide; for Button that is `Button.Root`, `Button.Icon`, and `Button.Text`. For a field that is `Input.Root`. For boxes that is `Layout.Box`, `Layout.Stack`, and `Layout.Grid`. For a slider, `Slider.Root` renders the track. For a table, `Table.Root` renders the scrollport. For a toast that is `Toast.Provider`, `Toast.Portal`, `Toast.Viewport`, `Toast.Root`, `Toast.Content`, `Toast.Title`, `Toast.Description`, and `Toast.Close`. For a floating panel that is `Widget.Panel`, `Widget.Header`, `Widget.Container`, and `Widget.Menu`. Each of Button and Layout takes `renderAs` `div` (default) or `span`. `Widget.Panel` takes `renderAs` `div` (default), `aside`, or `section`. Prop and composition details live on the JSDoc of each part.

Ship Button defaults. Pass `variant`, `size`, `radius`, `rounded`, or `sx` only for instance-specific layout or state.

Ship Layout defaults. `Layout.Box` keeps the element display. `Layout.Stack` is a column flex container and `Layout.Grid` is a grid container. Pass `renderAs`, `display`, `direction`, `wrap`, `gap`, `align`, `justify`, `grow`, `shrink`, `basis`, `p`, `px`, `py`, `m`, `mx`, `my`, `columns`, `rows`, or `sx` only for instance-specific layout. `p`/`m` set every side. `px`/`mx` set the inline axis and `py`/`my` set the block axis.

`@base-ui/react` stays inside `packages/ui/components`. App code under `src/` does not import it.

A control that is not exported from `@ui` gets a wrapper in `packages/ui/components` first. Export it from that package, then use the export.

# Input

Ship Input defaults. Pass `sx` for instance width or a one-off field.

```tsx
<Input.Root value={name} aria-label="Name" onValueChange={setName} />
```

`onValueChange` receives the next string. `onChange` stays available for a file input. Remaining props go to the input (`type`, `disabled`, `ref`).

# Slider

`Slider.Root` renders the track, the filled indicator, and the thumb. Pass `label` for the visible name and `readout` for the visible value. A string `readout` is also the spoken value. Pass `thumbLabel` when there is no `label`. Pass `valueText` when the spoken value differs from `readout`. Pass `sx` for the row, `controlSx` for the track width, and `readoutSx` for the value. Pass `children` to replace the track with `Control`, `Track`, `Indicator`, and `Thumb`.

```tsx
<Slider.Root
  min={0}
  max={100}
  value={value}
  onValueChange={setValue}
  label="Scale"
  readout="100%"
/>
```

`onValueChange` receives the next value while dragging and from the keyboard.

# Toast

Ship Toast defaults. `Toast.Provider` wraps the tree that raises toasts. `Toast.useToastManager()` returns the open toasts and `add` / `close`. Pass `sx` for instance placement.

```tsx
<Toast.Provider>
  {children}
  <Toast.Portal>
    <Toast.Viewport aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast.Root key={toast.id} toast={toast}>
          <Toast.Content>
            <Toast.Title />
            <Toast.Close>Dismiss</Toast.Close>
            <Toast.Description />
          </Toast.Content>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  </Toast.Portal>
</Toast.Provider>
```

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

# Table

`Table.Root` is a virtualized TanStack Table and the scrollport. It fills leftover space in a column flex parent. Pass `data`, `columns`, `getRowId`, and `aria-label`. `estimateSize` is the row height in pixels (default 32). `scrollToId` brings that row into view when the id changes. `getRowProps` returns `selected`, `locked`, and `onPointerDown` for each row.

Build columns with `createColumnHelper<TableFeatures, Row>()` from `@tanstack/react-table`. `Table.features` is that feature set. `meta.width` sets the column width. `meta.align` is `start` (default), `center`, or `end`. `meta.headerHidden` keeps the header for assistive tech and hides it.

```tsx
const columnHelper = createColumnHelper<TableFeatures, Row>()
const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
])

<Table.Root
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  aria-label="Rows"
/>
```

# Tokens

Import design tokens with the components: `import { Tokens } from '@ui'`. `import Tokens from '@ui/tokens'` is the same object.

Read `Tokens.size.md`, `Tokens.spacing.md`, `Tokens.color.neutral[100]`, `Tokens.color.blue[500]`, and `Tokens.media.narrow`. Shade steps run from light to dark. `white` and `black` steps are opacity percent.

Inside `stylex.create`, use the named import.

# Format

`bun fmt`

# Shell

Prefix shell commands with `rtk` so output stays small. Unfiltered output: `rtk proxy <cmd>`. Command map: @RTK.md
