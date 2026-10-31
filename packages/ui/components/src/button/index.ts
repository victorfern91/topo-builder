import { ButtonIcon, ButtonRoot, ButtonText } from "./button.tsx";

/** Compound button. Compose `Root` with optional `Icon` and `Text`. */
export const Button = {
  Root: ButtonRoot,
  Icon: ButtonIcon,
  Text: ButtonText,
};

export default Button;

export type {
  ButtonIconProps,
  ButtonRootProps,
  ButtonSize,
  ButtonTextProps,
  ButtonVariant,
} from "./types.ts";
