import type { InputProps as BaseInputProps } from "@base-ui/react/input";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties, Ref, TextareaHTMLAttributes } from "react";

export type InputRootProps = Omit<BaseInputProps, "className" | "style"> & {
  /** Extra StyleX styles, applied after the built-in field. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
};

export type InputAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "style" | "value" | "onChange"
> & {
  /** Extra StyleX styles, applied after the built-in field. */
  sx?: StyleXStyles;
  /** Merged after the StyleX class. Prefer `sx`. */
  className?: string;
  /** Merged after the StyleX style. Prefer `sx`. */
  style?: CSSProperties;
  value?: string;
  /** Next text, including its line breaks. */
  onValueChange?: (value: string) => void;
  onChange?: TextareaHTMLAttributes<HTMLTextAreaElement>["onChange"];
  ref?: Ref<HTMLTextAreaElement>;
};
