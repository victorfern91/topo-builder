# UI

Import interactive controls from `@ui` (`import { Alert, Button, Input, Layout, Menu, Popover, Select, Slider, Table, Toast, Toggle, Widget } from '@ui'`, `import Alert from '@ui/alert'`, `import Button from '@ui/button'`, `import Input from '@ui/input'`, `import Layout from '@ui/layout'`, `import Menu from '@ui/menu'`, `import Popover from '@ui/popover'`, `import Select from '@ui/select'`, `import Slider from '@ui/slider'`, `import Table from '@ui/table'`, `import Toast from '@ui/toast'`, `import Toggle from '@ui/toggle'`, or `import Widget from '@ui/widget'`). The package exports are the components available to the app. Compose the parts those exports provide; for an alert that is `Alert.Root`, `Alert.Portal`, `Alert.Backdrop`, `Alert.Popup`, `Alert.Title`, `Alert.Description`, and `Alert.Close`. For Button that is `Button.Root`, `Button.Icon`, and `Button.Text`. For a field that is `Input.Root`. For a select that is `Select.Root`, `Select.Trigger`, `Select.Value`, `Select.Icon`, `Select.Portal`, `Select.Positioner`, `Select.Popup`, `Select.List`, `Select.Item`, `Select.ItemIndicator`, `Select.Swatch`, and `Select.ItemText`. For a popover that is `Popover.Root`, `Popover.Trigger`, `Popover.Portal`, `Popover.Positioner`, `Popover.Popup`, `Popover.Title`, and `Popover.Close`. For a command menu that is `Menu.Root`, `Menu.Trigger`, `Menu.Portal`, `Menu.Positioner`, `Menu.Popup`, `Menu.Item`, `Menu.Separator`, `Menu.SubmenuRoot`, and `Menu.SubmenuTrigger`. For boxes that is `Layout.Box`, `Layout.Stack`, and `Layout.Grid`. For a slider, `Slider.Root` renders the track. For a toggle group that is `Toggle.Root` and `Toggle.Option`. For a table, `Table.Root` renders the scrollport. For a toast that is `Toast.Provider`, `Toast.Portal`, `Toast.Viewport`, `Toast.Root`, `Toast.Content`, `Toast.Icon`, `Toast.Title`, `Toast.Description`, `Toast.Action`, and `Toast.Close`. For a floating panel that is `Widget.Panel`, `Widget.Header`, `Widget.Container`, and `Widget.Menu`. Each of Button and Layout takes `renderAs` `div` (default) or `span`. `Widget.Panel` takes `renderAs` `div` (default), `aside`, or `section`. Prop and composition details live on the JSDoc of each part.

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

# Select

Ship Select defaults. Pass `sx` for instance width or a one-off field. `Select.Icon` renders a chevron. `children` replaces it. `Select.ItemIndicator` marks the selected option. `Select.Swatch` is the color icon. `Select.ItemText` is the option label.

```tsx
<Select.Root value={grade} onValueChange={setGrade}>
  <Select.Trigger aria-label="Route grade">
    <Select.Value placeholder="Grade" />
    <Select.Icon />
  </Select.Trigger>
  <Select.Portal>
    <Select.Positioner>
      <Select.Popup>
        <Select.List>
          <Select.Item value={5} label="5c">
            <Select.ItemIndicator />
            <Select.Swatch color="#6e9439" edge="#2a472f" />
            <Select.ItemText>5c</Select.ItemText>
          </Select.Item>
        </Select.List>
      </Select.Popup>
    </Select.Positioner>
  </Select.Portal>
</Select.Root>
```

`onValueChange` receives the next value. `value` `null` is the empty selection. A function child of `Select.Value` receives that value. `label` on `Select.Item` is the keyboard search text. `Select.Swatch` `color` is the fill and `edge` is the inset line. `Select.ItemIndicator` keeps its slot on every option and shows a check on the selected one. Use the same `Select.Swatch` in `Select.Value` so the closed field shows the selected color. The popup stays on the trigger. `alignItemWithTrigger` on `Select.Positioner` moves it so the selected option covers the trigger.

# Popover

Ship Popover defaults. `Trigger` opens the popup. `Close` is a menu row and closes the popup. Pass `sx` for instance chrome. `sideOffset` and `align` on `Positioner` place the popup.

```tsx
<Popover.Root>
  <Popover.Trigger>View</Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner sideOffset={6} align="start">
      <Popover.Popup>
        <Popover.Close>Open</Popover.Close>
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>
```

`onOpenChange` receives the next open state. A control inside `Popup` keeps the popup open. A disabled `Close` stays in the menu.

# Menu

Ship Menu defaults. Use Menu for a list of commands, and Popover when the popup holds controls. `Item` is a command row and closes every open level. `SubmenuRoot` nests a menu: its `SubmenuTrigger` row shows a chevron and opens the next `Portal` on hover, click, or the arrow key. `Separator` divides groups. Pass `sx` for instance chrome.

```tsx
<Menu.Root>
  <Menu.Trigger>File</Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner sideOffset={6} align="start">
      <Menu.Popup>
        <Menu.Item onClick={open}>Open…</Menu.Item>
        <Menu.SubmenuRoot>
          <Menu.SubmenuTrigger>Export</Menu.SubmenuTrigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item onClick={savePng}>PNG</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.SubmenuRoot>
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```

A disabled `Item` or `SubmenuTrigger` stays in the menu.

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

# Toggle

`Toggle.Root` is a group of choices. `Toggle.Option` is one choice. Pass `sx` for the group or an option.

```tsx
<Toggle.Root
  value={[system]}
  aria-label="Grade system"
  onValueChange={setSystem}
>
  <Toggle.Option value="french">French</Toggle.Option>
  <Toggle.Option value="yds">American</Toggle.Option>
</Toggle.Root>
```

`value` lists the pressed option values. An empty list presses none. `onValueChange` receives the next list. `multiple` lets more than one option stay pressed.

# Alert

Ship Alert defaults. `Alert.Root` is a modal that stays open until a `Close` button is pressed. Pass `sx` for instance chrome.

```tsx
<Alert.Root open={open} onOpenChange={setOpen}>
  <Alert.Portal>
    <Alert.Backdrop />
    <Alert.Popup>
      <Alert.Title>Unsaved changes</Alert.Title>
      <Alert.Description>
        Reloading discards the drawing on this page.
      </Alert.Description>
      <Layout.Stack direction="row" justify="end" gap="md">
        <Alert.Close>Stay</Alert.Close>
        <Alert.Close tone="warning">Reload</Alert.Close>
      </Layout.Stack>
    </Alert.Popup>
  </Alert.Portal>
</Alert.Root>
```

`Alert.Close` `tone` is `quiet` (default) or `warning`.

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
            <Toast.Icon type={toast.type} />
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

`Toast.Icon` shows the mark for `type`. `warning` is the alert glyph. Any other type uses info. `Toast.Action` renders the toast `actionProps`. `type: "warning"` on `add` paints the toast with a soft yellow wash.

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

`Widget.Panel` stays at its layout size. Pass `width` and `height` to pin the border box in pixels. Pass `resizable` to resize from the right edge, the bottom edge, and the corner. `onResize` reports the border box, in pixels, after layout and during that resize. Its third argument is `"user"` while the user resizes and `"layout"` after layout. `minWidth` and `minHeight` default to 48. `resizeLabel` names the corner handle. Arrow keys on that handle resize; Shift uses the larger step.

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

# State

Render atomically. The component that paints a value subscribes to that slice with `useSelector` or `useViewportSelector`. Pass an id or a callback into a child and let the child subscribe, so a store update re-renders that child.

Select one field. When one child paints several fields together, select them as one object with `{ compare: shallow }`. A handler that only needs the latest value reads `getState()` from `useViewport()` and stays unsubscribed.

A parent subscribes to the slice that decides which children exist: a panel open flag, a list of row ids.

# Format

`bun fmt`

# Shell

Prefix shell commands with `rtk` so output stays small. Unfiltered output: `rtk proxy <cmd>`. Command map: @RTK.md
