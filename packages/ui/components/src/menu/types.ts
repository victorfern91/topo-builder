import type {
  MenuGroupLabelProps as BaseMenuGroupLabelProps,
  MenuGroupProps as BaseMenuGroupProps,
  MenuItemProps as BaseMenuItemProps,
  MenuPopupProps as BaseMenuPopupProps,
  MenuPortalProps as BaseMenuPortalProps,
  MenuPositionerProps as BaseMenuPositionerProps,
  MenuRadioGroupProps as BaseMenuRadioGroupProps,
  MenuRadioItemIndicatorProps as BaseMenuRadioItemIndicatorProps,
  MenuRadioItemProps as BaseMenuRadioItemProps,
  MenuRootProps as BaseMenuRootProps,
  MenuSubmenuRootProps as BaseMenuSubmenuRootProps,
  MenuSubmenuTriggerProps as BaseMenuSubmenuTriggerProps,
  MenuTriggerProps as BaseMenuTriggerProps,
} from "@base-ui/react/menu";
import type { SeparatorProps as BaseSeparatorProps } from "@base-ui/react/separator";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

type MenuChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

type WithChrome<T> = Omit<T, "className" | "style"> & MenuChrome;

export type MenuRootProps<Payload = unknown> = BaseMenuRootProps<Payload>;
export type MenuTriggerProps<Payload = unknown> = WithChrome<
  BaseMenuTriggerProps<Payload>
>;
export type MenuPortalProps = WithChrome<BaseMenuPortalProps>;
export type MenuPositionerProps = WithChrome<BaseMenuPositionerProps>;
export type MenuPopupProps = WithChrome<BaseMenuPopupProps>;
export type MenuItemProps = WithChrome<BaseMenuItemProps>;
export type MenuSubmenuRootProps = BaseMenuSubmenuRootProps;
export type MenuSubmenuTriggerProps = WithChrome<BaseMenuSubmenuTriggerProps>;
export type MenuSeparatorProps = WithChrome<BaseSeparatorProps>;
export type MenuGroupProps = WithChrome<BaseMenuGroupProps>;
export type MenuGroupLabelProps = WithChrome<BaseMenuGroupLabelProps>;
export type MenuRadioGroupProps = WithChrome<BaseMenuRadioGroupProps>;
export type MenuRadioItemProps = WithChrome<BaseMenuRadioItemProps>;
export type MenuRadioItemIndicatorProps =
  WithChrome<BaseMenuRadioItemIndicatorProps>;
