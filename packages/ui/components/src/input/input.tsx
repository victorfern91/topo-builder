import { Input as BaseInput } from "@base-ui/react/input";
import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";
import { Tokens } from "../tokens.stylex.ts";
import type { InputRootProps } from "./types.ts";

/**
 * Text field. Renders an `<input>` and works inside Base UI Field.
 * Pass `sx` for width or a one-off field. Remaining props go to the input
 * (`type`, `value`, `defaultValue`, `onValueChange`, `onChange`, `disabled`, `ref`).
 *
 * @example
 * ```tsx
 * import { Input } from '@ui'
 *
 * <Input.Root value={name} aria-label="Name" onValueChange={setName} />
 * ```
 */
export function InputRoot({
  sx,
  className,
  style,
  ref,
  ...props
}: InputRootProps) {
  const styled = stylex.props(styles.root, sx);
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return (
    <BaseInput
      {...props}
      {...styled}
      ref={ref as Ref<HTMLElement>}
      className={mergedClass || undefined}
      style={{ ...styled.style, ...style }}
    />
  );
}

const styles = stylex.create({
  root: {
    appearance: "none",
    boxSizing: "border-box",
    display: "block",
    width: "100%",
    minWidth: 0,
    height: Tokens.size.md,
    margin: Tokens.spacing.none,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: Tokens.color.neutral[950],
    borderRadius: 4,
    backgroundColor: Tokens.color.neutral[850],
    color: Tokens.color.neutral[100],
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.2,
    cursor: {
      default: "text",
      ":disabled": "default",
    },
    opacity: {
      default: 1,
      ":disabled": 0.45,
    },
    outlineWidth: {
      default: 0,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": Tokens.color.blue[100],
    },
    outlineOffset: 1,
  },
});
