import { Slider as BaseSlider } from "@base-ui/react/slider";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { Tokens } from "../tokens.stylex.ts";
import type {
  SliderControlProps,
  SliderIndicatorProps,
  SliderLabelProps,
  SliderRootProps,
  SliderThumbProps,
  SliderTrackProps,
  SliderValueProps,
} from "./types.ts";

/**
 * Slider group. Compose `Control`, `Track`, `Indicator`, and `Thumb`.
 * `Label` and `Value` are optional.
 *
 * The control pads by half the thumb, so the thumb stays inside the ends.
 * Pass `sx` for width or flex. Remaining props go to the Base UI root
 * (`min`, `max`, `step`, `value`, `onValueChange`, `disabled`, `orientation`).
 *
 * @example
 * ```tsx
 * import { Slider } from '@ui'
 *
 * <Slider.Root min={0} max={100} value={value} onValueChange={setValue}>
 *   <Slider.Label>Scale</Slider.Label>
 *   <Slider.Control>
 *     <Slider.Track>
 *       <Slider.Indicator />
 *       <Slider.Thumb aria-valuetext="100%" />
 *     </Slider.Track>
 *   </Slider.Control>
 *   <Slider.Value>{() => '100%'}</Slider.Value>
 * </Slider.Root>
 * ```
 */
export function SliderRoot<Value extends number | readonly number[] = number>({
  sx,
  className,
  style,
  ...props
}: SliderRootProps<Value>) {
  const chrome = sliderChrome(stylex.props(styles.root, sx), className, style);

  return <BaseSlider.Root {...props} {...chrome} />;
}

/** Accessible name for the thumbs. Clicking it focuses the slider. */
export function SliderLabel({
  sx,
  className,
  style,
  ...props
}: SliderLabelProps) {
  const chrome = sliderChrome(stylex.props(styles.label, sx), className, style);

  return <BaseSlider.Label {...props} {...chrome} />;
}

/**
 * Text for the current value. Renders an `<output>`.
 * `children` receives the formatted value and the raw value.
 */
export function SliderValue({
  sx,
  className,
  style,
  ...props
}: SliderValueProps) {
  const chrome = sliderChrome(stylex.props(styles.value, sx), className, style);

  return <BaseSlider.Value {...props} {...chrome} />;
}

/** Hit target. Place `Track` inside it. */
export function SliderControl({
  sx,
  className,
  style,
  ...props
}: SliderControlProps) {
  const chrome = sliderChrome(
    stylex.props(styles.control, sx),
    className,
    style,
  );

  return <BaseSlider.Control {...props} {...chrome} />;
}

/** Groove. Place `Indicator` and `Thumb` inside it. */
export function SliderTrack({
  sx,
  className,
  style,
  ...props
}: SliderTrackProps) {
  const chrome = sliderChrome(stylex.props(styles.track, sx), className, style);

  return <BaseSlider.Track {...props} {...chrome} />;
}

/** Filled portion of the track. */
export function SliderIndicator({
  sx,
  className,
  style,
  ...props
}: SliderIndicatorProps) {
  const chrome = sliderChrome(
    stylex.props(styles.indicator, sx),
    className,
    style,
  );

  return <BaseSlider.Indicator {...props} {...chrome} />;
}

/**
 * Draggable thumb. `aria-label` names the slider when there is no `Label`.
 * `aria-valuetext` is the spoken value.
 */
export function SliderThumb({
  sx,
  className,
  style,
  ...props
}: SliderThumbProps) {
  const chrome = sliderChrome(stylex.props(styles.thumb, sx), className, style);

  return <BaseSlider.Thumb {...props} {...chrome} />;
}

function sliderChrome(
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
    display: "flex",
    alignItems: "center",
    gap: Tokens.spacing.md,
    minWidth: 0,
    opacity: {
      default: 1,
      "[data-disabled]": 0.45,
    },
  },
  label: {
    flexGrow: 0,
    flexShrink: 0,
    fontSize: 13,
    color: Tokens.color.neutral[400],
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  value: {
    flexGrow: 0,
    flexShrink: 0,
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
    color: Tokens.color.neutral[400],
    whiteSpace: "nowrap",
  },
  control: {
    boxSizing: "border-box",
    position: "relative",
    display: "flex",
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    height: 22,
    paddingInline: Tokens.spacing.md,
    touchAction: "none",
    userSelect: "none",
    cursor: {
      default: "pointer",
      "[data-disabled]": "default",
      "[data-dragging]": "grabbing",
    },
  },
  track: {
    position: "relative",
    flexGrow: 1,
    width: "100%",
    minWidth: 0,
    height: Tokens.size.xxs,
    borderRadius: 4,
    backgroundColor: Tokens.color.neutral[850],
  },
  indicator: {
    display: "block",
    borderRadius: 4,
    backgroundColor: Tokens.color.blue[500],
    pointerEvents: "none",
  },
  thumb: {
    boxSizing: "border-box",
    width: Tokens.size.xs,
    height: Tokens.size.xs,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: Tokens.color.blue[500],
    borderRadius: Tokens.size.xs,
    backgroundColor: Tokens.color.neutral[0],
    boxShadow: `0 1px 2px ${Tokens.color.black[45]}`,
    touchAction: "none",
    cursor: {
      default: "grab",
      "[data-disabled]": "default",
      "[data-dragging]": "grabbing",
    },
    outlineWidth: {
      default: 0,
      ":has(:focus-visible)": 2,
    },
    outlineStyle: {
      default: "none",
      ":has(:focus-visible)": "solid",
    },
    outlineColor: {
      default: "transparent",
      ":has(:focus-visible)": Tokens.color.blue[100],
    },
    outlineOffset: 1,
  },
});
