import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { Tokens } from "../tokens.stylex.ts";
import type { ToggleOptionProps, ToggleRootProps } from "./types.ts";

/**
 * Group of choices. One option is pressed unless `multiple` is set.
 * `value` lists the pressed option values. An empty list presses none.
 * Pass `sx` for the group. Remaining props go to the Base UI group
 * (`defaultValue`, `onValueChange`, `disabled`, `orientation`).
 *
 * @example
 * ```tsx
 * import { Toggle } from '@ui'
 *
 * <Toggle.Root
 *   value={[system]}
 *   aria-label="Grade system"
 *   onValueChange={setSystem}
 * >
 *   <Toggle.Option value="french">French</Toggle.Option>
 *   <Toggle.Option value="yds">American</Toggle.Option>
 * </Toggle.Root>
 * ```
 */
export function ToggleRoot<Value extends string = string>({
  sx,
  className,
  style,
  ...props
}: ToggleRootProps<Value>) {
  const chrome = toggleChrome(stylex.props(styles.root, sx), className, style);

  return <BaseToggleGroup {...props} {...chrome} />;
}

/**
 * One choice. `value` matches an entry in the group `value`.
 * Children are the visible label. Pass `sx` for this option.
 */
export function ToggleOption<Value extends string = string>({
  sx,
  className,
  style,
  ...props
}: ToggleOptionProps<Value>) {
  const chrome = toggleChrome(
    stylex.props(styles.option, sx),
    className,
    style,
  );

  return <BaseToggle {...props} {...chrome} />;
}

function toggleChrome(
  styled: ReturnType<typeof stylex.props>,
  className?: string,
  style?: CSSProperties,
) {
  const mergedClass = [styled.className, className].filter(Boolean).join(" ");

  return {
    className: mergedClass || undefined,
    style: { ...styled.style, ...style },
  };
}

const styles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    gap: Tokens.spacing.xxs,
    flexDirection: {
      default: "row",
      '[data-orientation="vertical"]': "column",
    },
    opacity: {
      default: 1,
      "[data-disabled]": 0.45,
    },
  },
  option: {
    appearance: "none",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: Tokens.size.sm,
    margin: Tokens.spacing.none,
    paddingBlock: Tokens.spacing.none,
    paddingInline: Tokens.spacing.md,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: {
      default: "transparent",
      ":hover": Tokens.color.white[8],
      "[data-pressed]": Tokens.color.blue[35],
    },
    color: "inherit",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: "inherit",
    lineHeight: 1.2,
    letterSpacing: "inherit",
    whiteSpace: "nowrap",
    textAlign: "center",
    userSelect: "none",
    cursor: {
      default: "pointer",
      ":disabled": "default",
      "[data-disabled]": "default",
    },
    opacity: {
      default: 1,
      ":disabled": 0.45,
      "[data-disabled]": 0.45,
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
