import type {
  SelectIconProps as BaseSelectIconProps,
  SelectItemIndicatorProps as BaseSelectItemIndicatorProps,
  SelectItemProps as BaseSelectItemProps,
  SelectItemTextProps as BaseSelectItemTextProps,
  SelectListProps as BaseSelectListProps,
  SelectPopupProps as BaseSelectPopupProps,
  SelectPortalProps as BaseSelectPortalProps,
  SelectPositionerProps as BaseSelectPositionerProps,
  SelectRootProps as BaseSelectRootProps,
  SelectTriggerProps as BaseSelectTriggerProps,
  SelectValueProps as BaseSelectValueProps,
} from "@base-ui/react/select";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

type SelectChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

type WithChrome<T> = Omit<T, "className" | "style"> & SelectChrome;

export type SelectRootProps<
  Value,
  Multiple extends boolean | undefined = false,
> = BaseSelectRootProps<Value, Multiple>;

export type SelectTriggerProps = WithChrome<BaseSelectTriggerProps>;
export type SelectValueProps = WithChrome<BaseSelectValueProps>;
export type SelectIconProps = WithChrome<BaseSelectIconProps>;
export type SelectItemIndicatorProps = WithChrome<BaseSelectItemIndicatorProps>;
export type SelectItemTextProps = WithChrome<BaseSelectItemTextProps>;

/** Color icon. `color` is the fill. `edge` is the inset line. */
export type SelectSwatchProps = SelectChrome & {
  /** Fill of the icon. */
  color: string;
  /** Inset edge. A dark line is used when omitted. */
  edge?: string;
};

export type SelectPortalProps = WithChrome<BaseSelectPortalProps>;
export type SelectPositionerProps = WithChrome<BaseSelectPositionerProps>;
export type SelectPopupProps = WithChrome<BaseSelectPopupProps>;
export type SelectListProps = WithChrome<BaseSelectListProps>;
export type SelectItemProps = WithChrome<BaseSelectItemProps>;
