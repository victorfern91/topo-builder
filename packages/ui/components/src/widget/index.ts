import {
  WidgetContainer,
  WidgetHeader,
  WidgetMenu,
  WidgetPanel,
} from "./widget.tsx";

/** Floating panel. Compose `Panel` with `Header`, `Container`, and `Menu`. */
export const Widget = {
  Panel: WidgetPanel,
  Header: WidgetHeader,
  Container: WidgetContainer,
  Menu: WidgetMenu,
};

export default Widget;

export type {
  WidgetContainerProps,
  WidgetHeaderProps,
  WidgetMenuProps,
  WidgetPanelProps,
  WidgetSurface,
} from "./types.ts";
