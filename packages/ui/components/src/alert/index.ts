import {
  AlertBackdrop,
  AlertClose,
  AlertDescription,
  AlertPopup,
  AlertPortal,
  AlertRoot,
  AlertTitle,
} from "./alert.tsx";

/**
 * Modal alert. Compose `Root`, `Portal`, `Backdrop`, `Popup`, `Title`,
 * `Description`, and `Close`. The dialog stays open until a close button
 * is pressed.
 */
export const Alert = {
  Root: AlertRoot,
  Portal: AlertPortal,
  Backdrop: AlertBackdrop,
  Popup: AlertPopup,
  Title: AlertTitle,
  Description: AlertDescription,
  Close: AlertClose,
};

export default Alert;

export type {
  AlertBackdropProps,
  AlertCloseProps,
  AlertCloseTone,
  AlertDescriptionProps,
  AlertPopupProps,
  AlertPortalProps,
  AlertRootProps,
  AlertTitleProps,
} from "./types.ts";
