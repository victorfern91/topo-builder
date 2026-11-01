import { Toast as BaseToast } from "@base-ui/react/toast";
import {
  ToastAction,
  ToastArrow,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastPositioner,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from "./toast.tsx";

/**
 * Toast stack. Wrap the tree in `Provider`, then compose `Portal`,
 * `Viewport`, `Root`, `Content`, `Title`, `Description`, and `Close`.
 * `useToastManager()` adds and closes toasts.
 */
export const Toast = {
  Provider: ToastProvider,
  Portal: ToastPortal,
  Viewport: ToastViewport,
  Root: ToastRoot,
  Content: ToastContent,
  Title: ToastTitle,
  Description: ToastDescription,
  Close: ToastClose,
  Action: ToastAction,
  Positioner: ToastPositioner,
  Arrow: ToastArrow,
  useToastManager: BaseToast.useToastManager,
  createToastManager: BaseToast.createToastManager,
};

export default Toast;

export type {
  ToastActionProps,
  ToastArrowProps,
  ToastCloseProps,
  ToastContentProps,
  ToastDescriptionProps,
  ToastPortalProps,
  ToastPositionerProps,
  ToastProviderProps,
  ToastRootProps,
  ToastTitleProps,
  ToastViewportProps,
} from "./types.ts";
