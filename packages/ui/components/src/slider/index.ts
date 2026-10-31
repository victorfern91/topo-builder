import {
  SliderControl,
  SliderIndicator,
  SliderLabel,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "./slider.tsx";

/** Range slider. Compose `Root` with `Control`, `Track`, `Indicator`, and `Thumb`. */
export const Slider = {
  Root: SliderRoot,
  Label: SliderLabel,
  Value: SliderValue,
  Control: SliderControl,
  Track: SliderTrack,
  Indicator: SliderIndicator,
  Thumb: SliderThumb,
};

export default Slider;

export type {
  SliderControlProps,
  SliderIndicatorProps,
  SliderLabelProps,
  SliderRootProps,
  SliderThumbProps,
  SliderTrackProps,
  SliderValueProps,
} from "./types.ts";
