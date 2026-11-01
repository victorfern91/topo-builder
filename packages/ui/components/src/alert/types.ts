import type {
  AlertDialogBackdropProps,
  AlertDialogCloseProps,
  AlertDialogDescriptionProps,
  AlertDialogPopupProps,
  AlertDialogPortalProps,
  AlertDialogTitleProps,
} from "@base-ui/react/alert-dialog";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties, ReactNode } from "react";

type AlertChrome = {
  /** Extra StyleX styles, applied after the built-in styles. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

type WithChrome<T> = Omit<T, "className" | "style"> & AlertChrome;

export type AlertRootProps = {
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Called when a close button opens or closes the dialog. */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

export type AlertPortalProps = WithChrome<AlertDialogPortalProps>;
export type AlertBackdropProps = WithChrome<AlertDialogBackdropProps>;
export type AlertPopupProps = WithChrome<AlertDialogPopupProps>;
export type AlertTitleProps = WithChrome<AlertDialogTitleProps>;
export type AlertDescriptionProps = WithChrome<AlertDialogDescriptionProps>;

/** `quiet` is a text button. `warning` is the orange confirm. */
export type AlertCloseTone = "quiet" | "warning";

export type AlertCloseProps = WithChrome<AlertDialogCloseProps> & {
  /** `quiet` (default) or `warning`. */
  tone?: AlertCloseTone;
};
